
'use strict';

var config = {
	tab: {
		minWidth: 100,
		maxWidth: 250,
		ratio: 0.68,
	},
};

var openingView = false;

async function openView() {

	var tabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});

	if(tabs.length > 0) {
		browser.tabs.update(Number(tabs[0].id), {active: true});
	}else{
		openingView = true;
		browser.tabs.create({url: "/view.html", active: true});
	}
}

async function tabCreated(tab) {
	if(!openingView) {

		var tabGroupId = await browser.sessions.getTabValue(tab.id, 'groupId');

		if(tabGroupId === undefined) {

			var activeGroup = undefined;

			while(activeGroup === undefined) {
				activeGroup = (await browser.sessions.getWindowValue(tab.windowId, 'activeGroup'));
			}

			browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
		}
	}else{
		openingView = false;
		browser.sessions.setTabValue(tab.id, 'groupId', -1);
	}
}

async function tabActivated(activeInfo) {

	const activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');

	if(activeGroup != -1) {
		const windowId = (await browser.windows.getCurrent()).id;
		await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);
	}

	const tabs = browser.tabs.query({currentWindow: true});

	for(const tab of await tabs) {
		var groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

		if(groupId != activeGroup) {
			if(browser.tabs.hide) {
				browser.tabs.hide(tab.id);
			}
		}else{
			if(browser.tabs.show) {
				browser.tabs.show(tab.id);
			}
		}
	}
}

async function setupWindows() {

	const windows = browser.windows.getAll({});

	for(const window of await windows) {

		var groups = await browser.sessions.getWindowValue(window.id, 'groups');

		if(groups === undefined) {
			createGroupInWindow(window);
		}
	}
}

async function newGroupUid(windowId) {
	var groupIndex = (await browser.sessions.getWindowValue(windowId, 'groupIndex'));

	var uid = groupIndex || 0;
	var newGroupIndex = uid + 1;

	await browser.sessions.setWindowValue(windowId, 'groupIndex', newGroupIndex);

	return uid;
}

async function createGroupInWindow(window) {

	var groupId = await newGroupUid(window.id);

	var groups = [{
		id: groupId,
		name: 'Unnamed Group',
		containerId: 'firefox-default',
		rect: {x: 0, y: 0, w: 0.25, h: 0.5},
		tabCount: 0,
	}];


	browser.sessions.setWindowValue(window.id, 'groups', groups);
	browser.sessions.setWindowValue(window.id, 'activeGroup', groupId);

	const tabs = browser.tabs.query({windowId: window.id});

	for(const tab of await tabs) {
		browser.sessions.setTabValue(tab.id, 'groupId', groupId);
	}
}

async function salvageGrouplessTabs() {

	// make array of all groups for quick look-up
	var windows = {};
	const _windows = await browser.windows.getAll({});

	for(const window of _windows) {
		windows[window.id] = {groups: null};
		windows[window.id].groups = await browser.sessions.getWindowValue(window.id, 'groups');
	}

	// check all tabs
	const tabs = browser.tabs.query({});

	for(const tab of await tabs) {
		var groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

		var groupExists = false;
		for(var i in windows[tab.windowId].groups) {
			if(windows[tab.windowId].groups[i].id == groupId) {
				groupExists = true;
				break;
			}
		}
		if(!groupExists && groupId != -1) {
			var activeGroup = await browser.sessions.getWindowValue(tab.windowId, 'activeGroup');
			browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
		}
	}
}

async function init() {

	await migrate069();
	await setupWindows();
	await salvageGrouplessTabs();

	browser.browserAction.onClicked.addListener(openView);
	browser.windows.onCreated.addListener(createGroupInWindow);
	browser.tabs.onCreated.addListener(tabCreated);
	browser.tabs.onActivated.addListener(tabActivated);
}

init();

async function migrate069(groups) {
	await browser.storage.local.clear();
}
