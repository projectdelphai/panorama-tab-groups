'use strict';

import { loadOptions } from "./_share/options.js";

const manifest = browser.runtime.getManifest();

let openingView = false;
let openingBackup = false;

/** Modulo in javascript does not behave like modulo in mathematics when x is negative.
 * Following code is based from this:
 * https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers */
function mod(x, n) {
	return (x % n + n) % n;
}

function addRefreshMenuItem() {
    browser.menus.remove("refresh-groups");
    browser.menus.remove("refresh-spacer");
    browser.menus.create({
        id: "refresh-spacer",
        type: "separator",
        parentId: "send-tab",
        contexts: ["tab"]
    });
    browser.menus.create({
        id: "refresh-groups",
        title: "Refresh Groups",
        parentId: "send-tab",
        contexts: ["tab"]
    });
}

async function createMenuList() {
    let windowId = (await browser.windows.getCurrent()).id;
    let groups = (await browser.sessions.getWindowValue(windowId, 'groups'));
    browser.menus.removeAll();

    browser.menus.create({
        id: "send-tab",
        title: "Send To Group",
        contexts: ["tab"]
    });

    for (var i in groups) {
        browser.menus.create({
            id: groups[i].id.toString(),
            title: groups[i].id + ": " + groups[i].name,
            parentId: "send-tab",
            contexts: ["tab"]
        });
    }
    addRefreshMenuItem();
}

createMenuList();

browser.runtime.onMessage.addListener(changeMenu);

function changeMenu(message) {
    switch (message.action) {
        case "createMenuItem":
            browser.menus.create({
                id: message.groupId,
                title: message.groupId + ": " + message.groupName,
                parentId: "send-tab",
                contexts: ["tab"]
            });
            addRefreshMenuItem(); // move refresh menu to end
           break;
        case "removeMenuItem":
            browser.menus.remove(message.groupId);
            break;
        case "updateMenuItem":
            browser.menus.update(message.groupId, {title: message.groupId + ": " + message.groupName});
    }
}

async function moveTab(tabId, groupId) {
    let windowId = (await browser.windows.getCurrent()).id;
    await browser.sessions.setTabValue(tabId, 'groupId', groupId);

    let toIndex = -1;
    await browser.tabs.move(tabId, {index: toIndex});

    let activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
    await toggleVisibleTabs(activeGroup);

}

async function menuClicked(info, tab) {
    let windowId = (await browser.windows.getCurrent()).id;
    switch (info.menuItemId) {
        case "refresh-groups":
            let groups = (await browser.sessions.getWindowValue(windowId, 'groups'));
            browser.menus.removeAll();
            createMenuList();
            break;
        default:
            // see if we're sending multiple tabs
            let tabs = await browser.tabs.query({highlighted: true });
            // if you select multiple tabs, your active tab is selected as well and needs to be filtered out
            if (tabs.length > 1) {
                let activeTabId = (await browser.tabs.query({active: true}))[0].id;
                for (let i in tabs) {
                    let tabId = tabs[i].id;
                    if (tabId != activeTabId) {
                        moveTab(tabId, info.menuItemId);
                    }
                }
            } 
            // otherwise just use the tab where the menu was clicked from
            // if you don't do multiselect, but just right click, the tab isn't actually highlighted
            else {
                let activeTabId = (await browser.tabs.query({active: true}))[0].id;
                if (activeTabId === tab.id) {
                    let visibleTabs = (await browser.tabs.query({hidden: false}));

                    // find position of active tab among visible tabs
                    let tabIndex = 0;
                    for (let i in visibleTabs) {
                        if (visibleTabs[i].id === tab.id) {
                            tabIndex = parseInt(i);
                            break;
                        }
                    }

                    // find neighboring tab and make it the active tab
                    let newActiveTab = tab;
                    if (visibleTabs[tabIndex-1] !== undefined) {
                        newActiveTab = visibleTabs[tabIndex-1];
                    } else if (visibleTabs[tabIndex+1] !== undefined) {
                        newActiveTab = visibleTabs[tabIndex+1]
                    }
                    await browser.tabs.update(newActiveTab.id, {active: true});
                }

                moveTab(tab.id, info.menuItemId);
            }
    }
}

browser.menus.onClicked.addListener(menuClicked);

async function triggerCommand(command) {
  const options = await loadOptions();

  if (options["shortcut"][command].disabled) {
    // Doesn't execute disabled command
    return;
  }
  if (command === "activate-next-group") {
    await changeActiveGroupBy(1);
  } else if (command === "activate-previous-group") {
    await changeActiveGroupBy(-1);
  } else if (command === "toggle-panorama-view") {
    await toggleView();
  }
}


/** Shift current active group by offset */
async function changeActiveGroupBy(offset) {
    const windowId = (await browser.windows.getCurrent()).id;
    const groups = await browser.sessions.getWindowValue(windowId, 'groups');

    let activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
    let activeIndex = groups.findIndex(function (group) { return group.id === activeGroup; });
    let newIndex = activeIndex + offset;

    activeGroup = groups[mod(newIndex, groups.length)].id;
    await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);

    await toggleVisibleTabs(activeGroup, true);
}

/** Open the Panorama View tab, or return to the last open tab if Panorama View is currently open */
async function toggleView() {
    let extTabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});
    if (extTabs.length > 0) {
        let currentTab = (await browser.tabs.query({active: true, currentWindow: true}))[0];
        // switch to last accessed tab in window
        if (extTabs[0].id == currentTab.id) {
            let tabs = await browser.tabs.query({currentWindow: true});
            tabs.sort((tabA, tabB) => tabB.lastAccessed - tabA.lastAccessed);

            // skip first tab which will be the panorama view
            if (tabs.length > 1) {
                await browser.tabs.update(tabs[1].id, {active: true});
            }

            // switch to Panorama View tab
        } else {
            await browser.tabs.update(extTabs[0].id, {active: true});
        }
    } else { // if there is no Panorama View tab, make one
        openingView = true;
        await browser.tabs.create({url: "/view.html", active: true});
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
        let tabGroupId = await browser.sessions.getTabValue(tab.id, 'groupId');
        if(tabGroupId === undefined) {
            let activeGroup = undefined;
            while(activeGroup === undefined) {
                activeGroup = await browser.sessions.getWindowValue(tab.windowId, 'activeGroup');
            }

            await browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
        }
    }else{
        // Opening the Panorama View tab
        // Make sure it's in the special group
        openingView = false;
        await browser.sessions.setTabValue(tab.id, 'groupId', -1);
    }
}

async function tabAttached(tabId, attachInfo) {
    let tab = await browser.tabs.get(tabId);
    await tabCreated(tab);
}

async function tabDetached(tabId, detachInfo) {
    await browser.sessions.removeTabValue(tabId, 'groupId');
}


/** Callback function which will be called whenever the user switches tabs.
 * This callback needed for properly switch between groups, when current tab
 * is from another group (or is Panorama Tab Groups tab).
 */
async function tabActivated(activeInfo) {
    let tab = await browser.tabs.get(activeInfo.tabId);

    if(tab.pinned) {
        return;
    }

    // Set the window's active group to the new active tab's group
    // If this is a newly-created tab, tabCreated() might not have set a
    // groupId yet, so retry until it does.
    let activeGroup = undefined;
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

    let showTabIds = [];
    let hideTabIds = [];
    let showTabs = [];

    await Promise.all(tabs.map(async(tab) => {
        try{
            let groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

            if(groupId != activeGroup) {
                hideTabIds.push(tab.id)
            }else{
                showTabIds.push(tab.id)
                showTabs.push(tab)
            }
        } catch {
            //The tab has probably been closed, this should be safe to ignore
        }
    }));

    if(noTabSelected) {
        showTabs.sort((tabA, tabB) => tabB.lastAccessed - tabA.lastAccessed);
        await browser.tabs.update(showTabs[0].id, {active: true});
    }

    await browser.tabs.hide(hideTabIds);
    await browser.tabs.show(showTabIds);
}

/** Make sure each window has a group */
async function setupWindows() {
    const windows = await browser.windows.getAll({});

    for (const window of windows) {
        await createGroupInWindowIfMissing(window);
    }
}

/** Get a new UID for a group */
async function newGroupUid(windowId) {
    let groupIndex = await browser.sessions.getWindowValue(windowId, 'groupIndex');

    let uid = groupIndex || 0;
    let newGroupIndex = uid + 1;

    await browser.sessions.setWindowValue(windowId, 'groupIndex', newGroupIndex);

    return uid;
}

/** Checks that group is missing before creating new one in window
 * This makes sure existing/restored windows are not reinitialized.
 * For example, windows that are restored by user (e.g. Ctrl+Shift+N) will
 * trigger the onCreated event but still have the existing group data.
 */
async function createGroupInWindowIfMissing(window) {
    let groups = await browser.sessions.getWindowValue(window.id, 'groups');

    if (!groups || !groups.length) {
        console.log(`No groups found for window ${window.id}!`);
        await createGroupInWindow(window);
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

    let groupId = await newGroupUid(window.id);

    let groups = [{
        id: groupId,
        name: groupId + ": " + browser.i18n.getMessage("defaultGroupName"),
        containerId: 'firefox-default',
        rect: {x: 0, y: 0, w: 0.5, h: 0.5},
        lastMoved: (new Date).getTime(),
    }];

    await browser.sessions.setWindowValue(window.id, 'groups', groups);
    await browser.sessions.setWindowValue(window.id, 'activeGroup', groupId);
}

/** Put any tabs that do not have a group into the active group */
async function salvageGrouplessTabs() {
    // make array of all groups for quick look-up
    let windows = {};
    const _windows = await browser.windows.getAll({});

    for(const window of _windows) {
        windows[window.id] = {groups: null};
        windows[window.id].groups = await browser.sessions.getWindowValue(window.id, 'groups');
    }

    // check all tabs
    const tabs = await browser.tabs.query({});

    for(const tab of tabs) {
        let groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

        let groupExists = false;
        for(let i in windows[tab.windowId].groups) {
            if(windows[tab.windowId].groups[i].id == groupId) {
                groupExists = true;
                break;
            }
        }

        if(!groupExists && groupId != -1) {
            let activeGroup = await browser.sessions.getWindowValue(tab.windowId, 'activeGroup');
            await browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
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
        let groups = await browser.sessions.getWindowValue(window.id, 'groups');

        if(groups[0].lastMoved !== undefined) {
            return;
        }

        let pitchX = 4;
        let pitchY = 2;

        if(groups.length > 8) {
            pitchX = 6;
            pitchY = 3;
        }else if(groups.length > 18) {
            pitchX = 8;
            pitchY = 4;
        }

        for(let i in groups) {
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
    if (details.temporary) return;
    // Open new tab to the release notes after update
    if (details.reason === 'update') {
        browser.tabs.create({
            url: `https://github.com/projectdelphai/panorama-tab-groups/releases/tag/${manifest.version}`
        });
    }
}

browser.runtime.onInstalled.addListener(onRuntimeInstallNotification);


