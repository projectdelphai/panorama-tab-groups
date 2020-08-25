import { loadOptions } from './_share/options.js';

const manifest = browser.runtime.getManifest();

window.backgroundState = {
  openingView: false,
  openingBackup: false,
};

window.viewRefreshOrdered = false;

/** Modulo in javascript does not behave like modulo in mathematics when x is negative.
 * Following code is based from this:
 * https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers */
function mod(x, n) {
  return (((x % n) + n) % n);
}

function addRefreshMenuItem() {
  browser.menus.remove('refresh-groups');
  browser.menus.remove('refresh-spacer');
  browser.menus.create({
    id: 'refresh-spacer',
    type: 'separator',
    parentId: 'send-tab',
    contexts: ['tab'],
  });
  browser.menus.create({
    id: 'refresh-groups',
    title: browser.i18n.getMessage('refreshGroups'),
    parentId: 'send-tab',
    contexts: ['tab'],
  });
}

async function createMenuList() {
  const windowId = (await browser.windows.getCurrent()).id;
  const groups = (await browser.sessions.getWindowValue(windowId, 'groups'));
  browser.menus.removeAll();

  browser.menus.create({
    id: 'send-tab',
    title: browser.i18n.getMessage('sendTab'),
    contexts: ['tab'],
  });

  // throws silent error if groups is undefined
  groups.forEach((group) => {
    browser.menus.create({
      id: group.id.toString(),
      title: `${group.id}: ${group.name}`,
      parentId: 'send-tab',
      contexts: ['tab'],
    });
  });
  addRefreshMenuItem();
}

createMenuList();

function changeMenu(message) {
  switch (message.action) {
    case 'createMenuItem':
      browser.menus.create({
        id: message.groupId,
        title: `${message.groupId}: ${message.groupName}`,
        parentId: 'send-tab',
        contexts: ['tab'],
      });
      addRefreshMenuItem(); // move refresh menu to end
      break;
    case 'removeMenuItem':
      browser.menus.remove(message.groupId);
      break;
    case 'updateMenuItem':
      browser.menus.update(message.groupId, { title: `${message.groupId}: ${message.groupName}` });
      break;
    default:
      break;
  }
}

browser.runtime.onMessage.addListener(changeMenu);

/** Set extension icon tooltip and numGroups to icon * */
async function setActionTitle(windowId, activeGroup = null) {
  let name;
  const groups = await browser.sessions.getWindowValue(windowId, 'groups');

  if (activeGroup === null) {
    activeGroup = await browser.sessions.getWindowValue(windowId, 'activeGroup');
  }

  groups.forEach((group) => {
    if (group.id === activeGroup) {
      name = group.name;
    }
  });
  browser.browserAction.setTitle({ title: `Active Group: ${name}`, windowId });
  browser.browserAction.setBadgeText({ text: String(groups.length), windowId });
  browser.browserAction.setBadgeBackgroundColor({ color: '#666666' });
}

async function toggleVisibleTabs(activeGroup, noTabSelected) {
  // Show and hide the appropriate tabs
  const tabs = await browser.tabs.query({ currentWindow: true });

  const showTabIds = [];
  const hideTabIds = [];
  const showTabs = [];

  await Promise.all(tabs.map(async (tab) => {
    try {
      const groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

      if (groupId !== activeGroup) {
        hideTabIds.push(tab.id);
      } else {
        showTabIds.push(tab.id);
        showTabs.push(tab);
      }
    } catch {
      // The tab has probably been closed, this should be safe to ignore
    }
  }));

  if (noTabSelected) {
    showTabs.sort((tabA, tabB) => tabB.lastAccessed - tabA.lastAccessed);
    await browser.tabs.update(showTabs[0].id, { active: true });
  }

  await browser.tabs.hide(hideTabIds);
  await browser.tabs.show(showTabIds);

  if (activeGroup >= 0) {
    const window = await browser.windows.getLastFocused();
    await setActionTitle(window.id, activeGroup);
  }
}

async function moveTab(tabId, groupId) {
  const windowId = (await browser.windows.getCurrent()).id;
  await browser.sessions.setTabValue(tabId, 'groupId', parseInt(groupId, 10));

  const toIndex = -1;
  await browser.tabs.move(tabId, { index: toIndex });

  const activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
  await toggleVisibleTabs(activeGroup);
}

async function menuClicked(info, tab) {
  switch (info.menuItemId) {
    case 'refresh-groups': {
      browser.menus.removeAll();
      createMenuList();
      break;
    }
    default: {
      // see if we're sending multiple tabs
      const tabs = await browser.tabs.query({ highlighted: true });
      // if you select multiple tabs, your active tab is selected as well
      // and needs to be filtered out
      if (tabs.length > 1) {
        const activeTabId = (await browser.tabs.query({ active: true }))[0].id;
        tabs.forEach((tempTab) => {
          const tabId = tempTab.id;
          if (tabId !== activeTabId) {
            moveTab(tabId, info.menuItemId);
          }
        });
      } else {
      // otherwise just use the tab where the menu was clicked from
      // if you don't do multiselect, but just right click, the tab isn't actually highlighted
        const activeTabId = (await browser.tabs.query({ active: true }))[0].id;
        if (activeTabId === tab.id) {
          const visibleTabs = (await browser.tabs.query({ hidden: false }));

          // find position of active tab among visible tabs
          let tabIndex = 0;
          visibleTabs.forEach((visibleTab, index) => {
            if (visibleTab.id === tab.id) {
              tabIndex = parseInt(index, 10);
            }
          });

          // find neighboring tab and make it the active tab
          let newActiveTab = tab;
          if (visibleTabs[tabIndex - 1] !== undefined) {
            newActiveTab = visibleTabs[tabIndex - 1];
          } else if (visibleTabs[tabIndex + 1] !== undefined) {
            newActiveTab = visibleTabs[tabIndex + 1];
          }
          await browser.tabs.update(newActiveTab.id, { active: true });
        }

        moveTab(tab.id, info.menuItemId);
      }
    }
  }
}

browser.menus.onClicked.addListener(menuClicked);

/** Shift current active group by offset */
async function changeActiveGroupBy(offset) {
  const windowId = (await browser.windows.getCurrent()).id;
  const groups = await browser.sessions.getWindowValue(windowId, 'groups');

  let activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
  const activeIndex = groups.findIndex((group) => group.id === activeGroup);
  const newIndex = activeIndex + offset;

  activeGroup = groups[mod(newIndex, groups.length)].id;
  await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);

  await toggleVisibleTabs(activeGroup, true);
}

/** Open the Panorama View tab, or return to the last open tab if Panorama View is currently open */
async function toggleView() {
  const extTabs = await browser.tabs.query({ url: browser.extension.getURL('view.html'), currentWindow: true });
  if (extTabs.length > 0) {
    const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    // switch to last accessed tab in window
    if (extTabs[0].id === currentTab.id) {
      const tabs = await browser.tabs.query({ currentWindow: true });
      tabs.sort((tabA, tabB) => tabB.lastAccessed - tabA.lastAccessed);

      // skip first tab which will be the panorama view
      if (tabs.length > 1) {
        await browser.tabs.update(tabs[1].id, { active: true });
      }

      // switch to Panorama View tab
    } else {
      await browser.tabs.update(extTabs[0].id, { active: true });
    }
  } else { // if there is no Panorama View tab, make one
    window.backgroundState.openingView = true;
    await browser.tabs.create({ url: '/view.html', active: true });
  }
}

async function triggerCommand(command) {
  const options = await loadOptions();

  if (options.shortcut[command].disabled) {
    // Doesn't execute disabled command
    return;
  }
  if (command === 'activate-next-group') {
    await changeActiveGroupBy(1);
  } else if (command === 'activate-previous-group') {
    await changeActiveGroupBy(-1);
  } else if (command === 'toggle-panorama-view') {
    await toggleView();
  }
}

/** Callback function which will be called whenever a tab is opened */
async function tabCreated(tab) {
  if (window.backgroundState.openingBackup) {
    return;
  }

  if (!window.backgroundState.openingView) {
    // Normal case: everything except the Panorama View tab
    // If the tab does not have a group, set its group to the current group
    const tabGroupId = await browser.sessions.getTabValue(tab.id, 'groupId');
    if (tabGroupId === undefined) {
      const activeGroup = await browser.sessions.getWindowValue(tab.windowId, 'activeGroup');

      await browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
    }
  } else {
    // Opening the Panorama View tab
    // Make sure it's in the special group
    window.backgroundState.openingView = false;
    await browser.sessions.setTabValue(tab.id, 'groupId', -1);
  }
}

async function tabAttached(tabId, attachInfo) { // eslint-disable-line no-unused-vars
  const tab = await browser.tabs.get(tabId);
  await tabCreated(tab);
}

async function tabDetached(tabId, detachInfo) { // eslint-disable-line no-unused-vars
  await browser.sessions.removeTabValue(tabId, 'groupId');
}

/** Callback function which will be called whenever the user switches tabs.
 * This callback needed for properly switch between groups, when current tab
 * is from another group (or is Panorama Tab Groups tab).
 */
async function tabActivated(activeInfo) {
  const tab = await browser.tabs.get(activeInfo.tabId);

  if (tab.pinned) {
    return;
  }

  // Set the window's active group to the new active tab's group
  // If this is a newly-created tab, tabCreated() might not have set a
  // groupId yet, so retry until it does.
  const activeGroup = await browser.sessions.getTabValue(activeInfo.tabId, 'groupId');

  if (activeGroup !== -1) {
    // activated tab is not Panorama View tab
    await browser.sessions.setWindowValue(tab.windowId, 'activeGroup', activeGroup);
  }

  await toggleVisibleTabs(activeGroup);
}

/** Get a new UID for a group */
async function newGroupUid(windowId) {
  const groupIndex = await browser.sessions.getWindowValue(windowId, 'groupIndex');

  const uid = groupIndex || 0;
  const newGroupIndex = uid + 1;

  await browser.sessions.setWindowValue(windowId, 'groupIndex', newGroupIndex);

  return uid;
}

/** Create the first group in a window
 * This handles new windows and, during installation, existing windows
 * that do not yet have a group */
async function createGroupInWindow(browserWindow) {
  if (window.backgroundState.openingBackup) {
    console.log('Skipping creation of groups since we are opening backup');
    return;
  }

  const groupId = await newGroupUid(browserWindow.id);

  const groups = [{
    id: groupId,
    name: `${groupId}: ${browser.i18n.getMessage('defaultGroupName')}`,
    containerId: 'firefox-default',
    rect: {
      x: 0, y: 0, w: 0.5, h: 0.5,
    },
    lastMoved: (new Date()).getTime(),
  }];

  await browser.sessions.setWindowValue(browserWindow.id, 'groups', groups);
  await browser.sessions.setWindowValue(browserWindow.id, 'activeGroup', groupId);
}
/** Checks that group is missing before creating new one in window
 * This makes sure existing/restored windows are not reinitialized.
 * For example, windows that are restored by user (e.g. Ctrl+Shift+N) will
 * trigger the onCreated event but still have the existing group data.
 */
async function createGroupInWindowIfMissing(browserWindow) {
  const groups = await browser.sessions.getWindowValue(browserWindow.id, 'groups');

  if (!groups || !groups.length) {
    console.log(`No groups found for window ${browserWindow.id}!`);
    await createGroupInWindow(browserWindow);
  }
  browser.browserAction.setTitle({ title: 'Active Group: Unnamed group', windowId: browserWindow.id });
  browser.browserAction.setBadgeText({ text: '1', windowId: browserWindow.id });
  browser.browserAction.setBadgeBackgroundColor({ color: '#666666' });
}
/** Make sure each window has a group */
async function setupWindows() {
  const windows = await browser.windows.getAll({});

  windows.forEach(async (window) => {
    await createGroupInWindowIfMissing(window);
  });
}

/** Put any tabs that do not have a group into the active group */
async function salvageGrouplessTabs() {
  // make array of all groups for quick look-up
  const windows = {};
  const tWindows = await browser.windows.getAll({});

  tWindows.forEach(async (window) => {
    windows[window.id] = { groups: null };
    windows[window.id].groups = await browser.sessions.getWindowValue(window.id, 'groups');
  });

  // check all tabs
  const tabs = await browser.tabs.query({});

  tabs.forEach(async (tab) => {
    const groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

    let groupExists = false;
    (windows[tab.windowId].groups).forEach((group) => {
      if (group.id === groupId) {
        groupExists = true;
      }
    });

    if (!groupExists && groupId !== -1) {
      const activeGroup = await browser.sessions.getWindowValue(tab.windowId, 'activeGroup');
      await browser.sessions.setTabValue(tab.id, 'groupId', activeGroup);
    }
  });
}

async function init() {
  const options = await loadOptions();

  console.log('Initializing Panorama Tab View');

  await setupWindows();
  await salvageGrouplessTabs();

  console.log('Finished setup');

  const disablePopupView = options.view !== 'popup';
  if (disablePopupView) {
    // Disable popup
    browser.browserAction.setPopup({
      popup: '',
    });

    browser.browserAction.onClicked.addListener(toggleView);
  }

  browser.commands.onCommand.addListener(triggerCommand);
  browser.windows.onCreated.addListener(createGroupInWindowIfMissing);
  browser.tabs.onCreated.addListener(tabCreated);
  browser.tabs.onAttached.addListener(tabAttached);
  browser.tabs.onDetached.addListener(tabDetached);
  browser.tabs.onActivated.addListener(tabActivated);
}

init();

window.refreshView = async function refreshView() {
  const options = await loadOptions();

  console.log('Refresh Panorama Tab View');
  window.viewRefreshOrdered = true;

  browser.browserAction.onClicked.removeListener(toggleView);
  browser.commands.onCommand.removeListener(triggerCommand);
  browser.windows.onCreated.removeListener(createGroupInWindowIfMissing);
  browser.tabs.onCreated.removeListener(tabCreated);
  browser.tabs.onAttached.removeListener(tabAttached);
  browser.tabs.onDetached.removeListener(tabDetached);
  browser.tabs.onActivated.removeListener(tabActivated);

  const disablePopupView = options.view !== 'popup';
  if (disablePopupView) {
    // Disable popup
    browser.browserAction.setPopup({
      popup: '',
    });

    browser.browserAction.onClicked.addListener(toggleView);
  } else {
    // Re-enable popup
    browser.browserAction.setPopup({
      popup: 'popup-view/index.html',
    });
  }

  browser.commands.onCommand.addListener(triggerCommand);
  browser.windows.onCreated.addListener(createGroupInWindowIfMissing);
  browser.tabs.onCreated.addListener(tabCreated);
  browser.tabs.onAttached.addListener(tabAttached);
  browser.tabs.onDetached.addListener(tabDetached);
  browser.tabs.onActivated.addListener(tabActivated);
};

// TODO: Remove? Is this used?
function handleMessage(message, sender) { // eslint-disable-line no-unused-vars
  if (message === 'activate-next-group') {
    triggerCommand('activate-next-group');
  } else if (message === 'activate-previous-group') {
    triggerCommand('activate-previous-group');
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
      url: `https://github.com/projectdelphai/panorama-tab-groups/releases/tag/${manifest.version}`,
    });
  }
}

browser.runtime.onInstalled.addListener(onRuntimeInstallNotification);
