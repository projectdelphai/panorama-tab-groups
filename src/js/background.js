
'use strict';

var config = {
	tab: {
		minWidth: 100,
		maxWidth: 250,
		ratio: 0.68,
	},
};

var openingView = false;

/** Open the Panorama View tab */
async function openView() {

	// Check if it's already open (possibly in a hidden tab)
	var tabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});

	// Switch to the open tab, or open a new one
	if(tabs.length > 0) {
		browser.tabs.update(Number(tabs[0].id), {active: true});
	}else{
		openingView = true;
		browser.tabs.create({url: "/view.html", active: true});
	}
}

/** Callback function which will be called whenever a tab is opened */
async function tabCreated(tab) {
	if(!openingView) {
		// Normal case: everything except the Panorama View tab
		// If the tab does not have a group, set its group to the current group
		var tabGroupId = await browser.sessions.getTabValue(tab.id, 'groupId');

		if(tabGroupId === undefined) {

			var activeGroup = undefined;

			while(activeGroup === undefined) {
				activeGroup = (await browser.sessions.getWindowValue(tab.windowId, 'activeGroup'));
			}

			browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
		}
	}else{
		// Opening the Panorama View tab
		// Make sure it's in the special group
		openingView = false;
		browser.sessions.setTabValue(tab.id, 'groupId', -1);
	}
}

/** Callback function which will be called whenever the user switches tabs */
async function tabActivated(activeInfo) {

	// Set the window's active group to the new active tab's group
	// If this is a newly-created tab, tabCreated() might not have set a
	// groupId yet, so retry until it does.
	var activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');
	while (activeGroup === undefined) {
		activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');
	}

	if(activeGroup != -1) {
		const windowId = (await browser.windows.getCurrent()).id;
		await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);
	}

	// Show and hide the appropriate tabs
	const tabs = await browser.tabs.query({currentWindow: true});

	var showTabs = [];
	var hideTabs = [];

	await Promise.all(tabs.map( async(tab) => {
		var groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

		if(groupId != activeGroup) {
			hideTabs.push(tab.id)
		}else{
			showTabs.push(tab.id)
		}
	}));
	browser.tabs.hide(hideTabs);
	browser.tabs.show(showTabs);
}

/** Make sure each window has a group */
async function setupWindows() {

	const windows = browser.windows.getAll({});

	for(const window of await windows) {

		var groups = await browser.sessions.getWindowValue(window.id, 'groups');

		if(groups === undefined) {
			createGroupInWindow(window);
		}
	}
}

/** Get a new UID for a group */
async function newGroupUid(windowId) {
	var groupIndex = (await browser.sessions.getWindowValue(windowId, 'groupIndex'));

	var uid = groupIndex || 0;
	var newGroupIndex = uid + 1;

	await browser.sessions.setWindowValue(windowId, 'groupIndex', newGroupIndex);

	return uid;
}

/** Create the first group in a window
 * This handles new windows and, during installation, existing windows
 * that do not yet have a group */
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

/** Put any tabs that do not have a group into the active group */
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
