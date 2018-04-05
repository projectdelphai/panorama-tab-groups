
'use strict';

/*var config = {
	tab: {
		minWidth: 100,
		maxWidth: 250,
		ratio: 0.68,
	},
};*/

var openingView = false;
var openingBackup = false;

async function triggerCommand(command) {
	if (command === "activate-next-group") {
		const windowId = (await browser.windows.getCurrent()).id;
		const groups = await browser.sessions.getWindowValue(windowId, 'groups');

		var activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
		var activeIndex = groups.findIndex(function(group){ return group.id === activeGroup; });
		var newIndex = activeIndex + 1;

		activeGroup = newIndex in groups ? groups[newIndex].id : 0;
		await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);

		await toggleVisibleTabs(activeGroup, true);
	}else if (command === "toggle-panorama-view") {
		toggleView();
	}
}

/** Open the Panorama View tab, or return to the last open tab if Panorama View is currently open */
async function toggleView() {

	var extTabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});

	if(extTabs.length > 0) {

		var currentTab = (await browser.tabs.query({active: true, currentWindow: true}))[0];

		// switch to last accessed tab in window
		if(extTabs[0].id == currentTab.id) {

			var tabs = await browser.tabs.query({currentWindow: true});

			tabs.sort(function(tabA, tabB) {
				return tabB.lastAccessed - tabA.lastAccessed;
			});

			// skip first tab which will be the panorama view
			if(tabs.length > 1) {
				browser.tabs.update(tabs[1].id, {active: true});
			}

		// switch to Panorama View tab
		}else{
			browser.tabs.update(extTabs[0].id, {active: true});
		}

	// if there is no Panorama View tab, make one
	}else{
		openingView = true;
		browser.tabs.create({url: "/view.html", active: true});
	}
}

/** Callback function which will be called whenever a tab is opened */
async function tabCreated(tab) {
	if(!openingBackup) {
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
}

async function tabAttached(tabId, attachInfo) {
	var tab = await browser.tabs.get(tabId);
	tabCreated(tab);
}

function tabDetached(tabId, detachInfo) {
	browser.sessions.removeTabValue(tabId, 'groupId');
}


/** Callback function which will be called whenever the user switches tabs */
async function tabActivated(activeInfo) {

	var tab = await browser.tabs.get(activeInfo.tabId);

	if(!tab.pinned) {

		// Set the window's active group to the new active tab's group
		// If this is a newly-created tab, tabCreated() might not have set a
		// groupId yet, so retry until it does.
		var activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');
		while (activeGroup === undefined) {
			activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');
		}

		if(activeGroup != -1) {
			await browser.sessions.setWindowValue(tab.windowId, 'activeGroup', activeGroup);
		}

		await toggleVisibleTabs(activeGroup);
	}
}

async function toggleVisibleTabs(activeGroup, noTabSelected) {

	// Show and hide the appropriate tabs
	const tabs = await browser.tabs.query({currentWindow: true});

	var showTabIds = [];
	var hideTabIds = [];

	var showTabs = [];

	await Promise.all(tabs.map(async(tab) => {
		var groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

		if(groupId != activeGroup) {
			hideTabIds.push(tab.id)
		}else{
			showTabIds.push(tab.id)
			showTabs.push(tab)
		}
	}));

	if(noTabSelected) {
		showTabs.sort(function(tabA, tabB) {
			return tabB.lastAccessed - tabA.lastAccessed;
		});
		browser.tabs.update(showTabs[0].id, {active: true});
	}

	browser.tabs.hide(hideTabIds);
	browser.tabs.show(showTabIds);
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

	if(!openingBackup) {

		var currentGroups = await browser.sessions.getWindowValue(window.id, 'groups');

		if(!currentGroups) {

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

			//const tabs = browser.tabs.query({windowId: window.id}); // why is this here..?
		}
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

	await setupWindows();
	await salvageGrouplessTabs();

	browser.commands.onCommand.addListener(triggerCommand);
	browser.browserAction.onClicked.addListener(toggleView);
	browser.windows.onCreated.addListener(createGroupInWindow);
	browser.tabs.onCreated.addListener(tabCreated);
	browser.tabs.onAttached.addListener(tabAttached);
	browser.tabs.onDetached.addListener(tabDetached);
	browser.tabs.onActivated.addListener(tabActivated);
}

init();
