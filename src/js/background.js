
'use strict';

let manifest = browser.runtime.getManifest();

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
    } else if (command === "activate-previous-group") {
                const windowId = (await browser.windows.getCurrent()).id;
		const groups = await browser.sessions.getWindowValue(windowId, 'groups');

		var activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
		var activeIndex = groups.findIndex(function(group){ return group.id === activeGroup; });
		var newIndex = activeIndex - 1;

		activeGroup = newIndex in groups ? groups[newIndex].id : groups.length - 1;
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
	if(openingBackup) {
		return;
	}

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

async function tabAttached(tabId, attachInfo) {
	var tab = await browser.tabs.get(tabId);
	tabCreated(tab);
}

function tabDetached(tabId, detachInfo) {
	browser.sessions.removeTabValue(tabId, 'groupId');
}


/** Callback function which will be called whenever the user switches tabs.
 * This callback needed for properly switch between groups, when current tab
 * is from another group (or is Panorama Tab Groups tab).
*/
async function tabActivated(activeInfo) {

	var tab = await browser.tabs.get(activeInfo.tabId);

	if(tab.pinned) {
		return;
	}

	// Set the window's active group to the new active tab's group
	// If this is a newly-created tab, tabCreated() might not have set a
	// groupId yet, so retry until it does.
	var activeGroup = undefined;
	while (activeGroup === undefined) {
		activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');
	}

	if(activeGroup != -1) {
		// activated tab is not Panorama View tab
		await browser.sessions.setWindowValue(tab.windowId, 'activeGroup', activeGroup);
	}

	await toggleVisibleTabs(activeGroup);
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
		createGroupInWindowIfMissing(window);
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

/** Checks that group is missing before creating new one in window
 * This makes sure existing/restored windows are not reinitialized.
 * For example, windows that are restored by user (e.g. Ctrl+Shift+N) will
 * trigger the onCreated event but still have the existing group data.
 */
async function createGroupInWindowIfMissing(window) {
	var groups = await browser.sessions.getWindowValue(window.id, 'groups');

	if (!groups || !groups.length) {
		console.log(`No groups found for window ${window.id}!`);
		createGroupInWindow(window);
	}
}

/** Create the first group in a window
 * This handles new windows and, during installation, existing windows
 * that do not yet have a group */
async function createGroupInWindow(window) {

	if(openingBackup) {
		console.log('Skipping creation of groups since we are opening backup');
		return;
	}

	var groupId = await newGroupUid(window.id);

	var groups = [{
		id: groupId,
		name: browser.i18n.getMessage("defaultGroupName"),
		containerId: 'firefox-default',
		rect: {x: 0, y: 0, w: 0.5, h: 0.5},
		lastMoved: (new Date).getTime(),
	}];


	browser.sessions.setWindowValue(window.id, 'groups', groups);
	browser.sessions.setWindowValue(window.id, 'activeGroup', groupId);
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

	console.log('Initializing Panorama Tab View');

	await setupWindows();
	await salvageGrouplessTabs();

	console.log('Finished setup');

	await migrate(); //keep until everyone are on 0.8.0

	browser.commands.onCommand.addListener(triggerCommand);
	browser.browserAction.onClicked.addListener(toggleView);
	browser.windows.onCreated.addListener(createGroupInWindowIfMissing);
	browser.tabs.onCreated.addListener(tabCreated);
	browser.tabs.onAttached.addListener(tabAttached);
	browser.tabs.onDetached.addListener(tabDetached);
	browser.tabs.onActivated.addListener(tabActivated);
}

init();

// migrate to transformable groups
async function migrate() {

	const windows = await browser.windows.getAll({});

	for(const window of windows) {
		var groups = await browser.sessions.getWindowValue(window.id, 'groups');

		if(groups[0].lastMoved !== undefined) {
			return;
		}

		var pitchX = 4;
		var pitchY = 2;

		if(groups.length > 8) {
			pitchX = 6;
			pitchY = 3;
		}else if(groups.length > 18) {
			pitchX = 8;
			pitchY = 4;
		}

		for(var i in groups) {
			groups[i].rect = {
				x: (1/pitchX) * (i % pitchX),
				y: (1/pitchY) * Math.floor(i / pitchX),
				w: 1/pitchX,
				h: 1/pitchY,
			};
			groups[i].lastMoved = (new Date).getTime();
		}
		await browser.sessions.setWindowValue(window.id, 'groups', groups);
	}
}

function handleMessage(message, sender) {
    if (message === "toggle-panorama-view") {
        toggleView();
    }
    else if (message == "activate-next-group") {
        triggerCommand("activate-next-group");
    }
    else if (message == "activate-previous-group") {
        triggerCommand("activate-previous-group");
    }
}

browser.runtime.onMessageExternal.addListener(handleMessage);

/*
 * Handle upboarding
 */
function onRuntimeInstallNotification(details) {
	// Open new tab to the release notes after update
  if (details.reason = 'update') {
    browser.tabs.create({
      url: `https://github.com/projectdelphai/panorama-tab-groups/releases/tag/${manifest.version}`
    });
  }
}

browser.runtime.onInstalled.addListener(onRuntimeInstallNotification);
