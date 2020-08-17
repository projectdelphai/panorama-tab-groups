import { getGroupId } from './tabs.js';
import {
  tabMoved, groupDragOver, outsideDrop, createDragIndicator,
} from './drag.js';
import {
  groupNodes, initGroupNodes, closeGroup, makeGroupNode, fillGroupNodes, insertTab, resizeGroups, raiseGroup, updateGroupFit,
} from './groupNodes.js';
import {
  initTabNodes, makeTabNode, updateTabNode, setActiveTabNode, setActiveTabNodeById, getActiveTabId, deleteTabNode, updateThumbnail, updateFavicon,
} from './tabNodes.js';
import * as groups from './groups.js';

const view = {
  windowId: -1,
  tabId: -1,
  groupsNode: null,
  dragIndicator: null,
  // intervalId: null,
  tabs: {},
};

let pendingReload = false;

function queueReload() {
  if (document.hidden) {
    pendingReload = true;
  } else {
    location.reload();
  }
}

// Load settings
browser.storage.sync.get({
  useDarkTheme: false,
  theme: 'light',
  toolbarPosition: 'top',
}).then((options) => {
  /*
     * Migrate legacy theme setting
     * @deprecate should be removed in v1.0.0
     */
  if (options.useDarkTheme) {
    options.theme = 'dark';
    browser.storage.sync.set({
      useDarkTheme: null,
      theme: 'dark',
    });
  }
  setTheme(options.theme);
  setToolbarPosition(options.toolbarPosition);

  browser.storage.onChanged.addListener((changes, area) => {
    if (area == 'sync') {
      if (changes.theme) {
        setTheme(changes.theme.newValue);
      }
      if (changes.toolbarPosition) {
        setToolbarPosition(changes.toolbarPosition.newValue);
      }
    }
  });

  initView();
});

function setTheme(theme) {
  replaceClass('theme', theme);
}

function setToolbarPosition(position) {
  replaceClass('toolbar', position);
}

function replaceClass(prefix, value) {
  const { classList } = document.getElementsByTagName('body')[0];
  for (const classObject of classList) {
    if (classObject.startsWith(`${prefix}-`)) {
      classList.remove(classObject);
    }
  }
  classList.add(`${prefix}-${value}`);
}

async function captureThumbnail(tab) {
  const tabId = tab.id;

  const cachedThumbnail = await browser.sessions.getTabValue(tabId, 'thumbnail');

  // Only capture a new thumbnail if there's no cached one, the cached one doesn't have a capturedTime,
  // or the tab was accessed since the cache was made
  if (!cachedThumbnail || !cachedThumbnail.capturedTime || cachedThumbnail.capturedTime < tab.lastAccessed) {
    const data = await browser.tabs.captureTab(tabId, { format: 'jpeg', quality: 25 });
    const img = new Image();

    img.onload = async function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = 500;
      canvas.height = canvas.width * (this.height / this.width);

      // ctx.imageSmoothingEnabled = true;
      // ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

      updateThumbnail(tabId, thumbnail);
      browser.sessions.setTabValue(tabId, 'thumbnail', {
        thumbnail,
        capturedTime: Date.now(),
      });
    };

    img.src = data;
  }
}

async function captureThumbnails() {
  const tabs = browser.tabs.query({ currentWindow: true, discarded: false });

  for (const tab of await tabs) {
    await captureThumbnail(tab); // await to lessen strain on browser
  }
}

async function doubleClick(e) {
  if (e.target.className === 'content transition') {
    const groupID = e.target.getAttribute('groupid');
    const group = groups.get(groupID);
    closeGroup(e.target, group);
  } else if (e.target.id === 'groups') {
    createGroup(e.clientX, e.clientY);
  }
}

async function singleClick(e) {
  if (e.target.className === 'content transition') {
    const groupID = e.target.getAttribute('groupid');
    raiseGroup(groupID);
  }
  event.stopPropagation();
}

/*
 * Search through tabs based on input field
 */
async function searchTabs() {
  const tabs = await browser.tabs.query({ currentWindow: true });
  const searchInput = document.getElementById('tab-search').value;
  // get old active tab in case search doesn't find any valid tabs
  let futureActiveTabId = getActiveTabId();
  for (const tabIndex in tabs) {
    const { title } = tabs[tabIndex];
    // lowercase both inputs and compare to see if match
    if (title.toLowerCase().includes(searchInput.toLowerCase())) {
      futureActiveTabId = tabs[tabIndex].id;
      break;
    }
  }
  setActiveTabNodeById(futureActiveTabId);
}
/**
 * Initialize the Panorama View tab
 *
 * This displays all the groups and the tabs in them, and sets up listeners
 * to respond to user actions and react to changes
 */
async function initView() {
  // set tiling off initially
  const windowId = (await browser.windows.getCurrent()).id;
  const tilingStatus = await browser.sessions.setWindowValue(windowId, 'tilingStatus', 'true');
  setLayoutMode('freeform');

  // set locale specific titles
  document.getElementById('newGroup').title = browser.i18n.getMessage('newGroupButton');
  document.getElementById('settings').title = browser.i18n.getMessage('settingsButton');
  document.getElementById('tiling').title = browser.i18n.getMessage('tilingButton');
  document.getElementById('freeform').title = browser.i18n.getMessage('freeformButton');

  view.windowId = (await browser.windows.getCurrent()).id;
  view.tabId = (await browser.tabs.getCurrent()).id;
  view.groupsNode = document.getElementById('groups');

  view.groupsNode.appendChild(createDragIndicator());

  await groups.init();

  // init Nodes
  await initTabNodes(view.tabId);
  await initGroupNodes(view.groupsNode);

  resizeGroups();

  captureThumbnails();
  // view.intervalId = setInterval(captureThumbnails, 2000);

  // set all listeners

  // Listen for clicks on new group button
  document.getElementById('newGroup').addEventListener('click', (e) => createGroup(), false);

  // Listen for clicks on settings button
  document.getElementById('settings').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  }, false);

  document.getElementById('freeform').addEventListener('click', () => {
    setLayoutMode('freeform');
  }, false);

  // Listen for tiling toggle
  document.getElementById('tiling').addEventListener('click', () => {
    setLayoutMode('tiling');
  }, false);

  // Listen for search input
  document.getElementById('tab-search').addEventListener('input', searchTabs);

  // Listen for middle clicks in background to open new group
  document.getElementById('groups').addEventListener('auxclick', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.target != document.getElementById('groups')) return; // ignore middle clicks in foreground
    if (event.button != 1) return; // middle mouse

    createGroup(e.clientX, e.clientY);
  }, false);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const background = browser.extension.getBackgroundPage();

      if (pendingReload || background.viewRefreshOrdered) {
        background.viewRefreshOrdered = false;
        location.reload();
      }

      setActiveTabNode(view.tabId);
      captureThumbnails();
    }
  }, false);

  window.addEventListener('resize', resizeGroups);
  document.addEventListener('keydown', keyInput);

  // Listen for tabs being added/removed/switched/etc. and update appropriately
  browser.tabs.onCreated.addListener(tabCreated);
  browser.tabs.onRemoved.addListener(tabRemoved);
  browser.tabs.onUpdated.addListener(tabUpdated, {
    // This page doesn't care about tabs in other windows
    windowId: view.windowId,
    // We don't want to listen for every property because that includes
    // the hidden state changing which generates a ton of events
    // every time the active group changes
    properties: [
      'discarded',
      'favIconUrl',
      'pinned',
      'title',
      'status',
    ],
  });
  browser.tabs.onMoved.addListener(tabMoved);
  browser.tabs.onAttached.addListener(tabAttached);
  browser.tabs.onDetached.addListener(tabDetached);

  view.groupsNode.addEventListener('dragover', groupDragOver, false);
  view.groupsNode.addEventListener('drop', outsideDrop, false);
  view.groupsNode.addEventListener('dblclick', doubleClick, false);
  view.groupsNode.addEventListener('click', singleClick, false);
}

// Tiling functionality
// Toggle tiling on or off
async function setLayoutMode(mode) {
  const windowId = (await browser.windows.getCurrent()).id;

  if (mode == 'tiling') {
    await browser.sessions.setWindowValue(windowId, 'layoutMode', 'tiling');
    activateTiling();
  } else {
    await browser.sessions.setWindowValue(windowId, 'layoutMode', 'freeform');
    resizeGroups();
  }
}

async function activateTiling() {
  const windowId = (await browser.windows.getCurrent()).id;
  await browser.sessions.getWindowValue(windowId, 'layoutMode');

  const numGroups = groups.getLength();

  // get number of groups per row
  const maxGroups = Math.ceil(Math.sqrt(numGroups));
  const quotient = Math.floor(numGroups / maxGroups);
  const remainder = numGroups % maxGroups;

  const gridLayout = Array(quotient).fill(maxGroups);
  if (remainder != 0) {
    gridLayout.push(remainder);
  }

  const groupIds = groups.getIds();
  let currentIndex = 0;
  console.log(gridLayout);
  // gridLayout[i] = number of cells per row
  for (const i in gridLayout) {
    // j = specific cell in each row
    for (let j = 0; j < gridLayout[i]; j++) {
      console.log(`i: ${i}, j: ${j}`);
      const rect = {};
      rect.x = j / gridLayout[i];
      rect.y = i / gridLayout.length;
      rect.w = 1.0 / gridLayout[i];
      rect.h = 1.0 / gridLayout.length;
      rect.i = rect.x + rect.w;
      rect.j = rect.y + rect.h;
      console.log(groupIds[currentIndex]);
      console.log(rect);
      groups.transform(groupIds[currentIndex], rect);
      resizeGroups(groupIds[currentIndex], rect);
      currentIndex++;
    }
  }
}

async function keyInput(e) {
  if (e.key === 'ArrowRight') {
    var activeTabId = getActiveTabId();
    var groupId = await getGroupId(activeTabId);
    var { childNodes } = groupNodes[groupId].content;

    for (var i = 0; i < childNodes.length; i++) {
      var tabId = Number(childNodes[i].getAttribute('tabId'));
      if (tabId == activeTabId) {
        break;
      }
    }

    var newTabId = -1;
    var max = childNodes.length - 2;
    // check if at end or if tab not found
    if (i == max || i == childNodes.length) {
      var newGroupId = -1;
      var groupsLength = Object.keys(groupNodes).length;

      const last = Object.keys(groupNodes)[groupsLength - 2];
      if (groupId == last) {
        var first = Object.keys(groupNodes)[0];
        groupId = first;
      } else {
        var index = Object.keys(groupNodes).indexOf(groupId.toString());
        groupId = Object.keys(groupNodes)[index + 1];
      }
      childNodes = groupNodes[groupId].content.childNodes;
      newTabId = Number(childNodes[0].getAttribute('tabId'));
    } else {
      newTabId = Number(childNodes[i + 1].getAttribute('tabId'));
    }

    setActiveTabNodeById(newTabId);
  } else if (e.key === 'ArrowLeft') {
    var activeTabId = getActiveTabId();
    var groupId = await getGroupId(activeTabId);
    var { childNodes } = groupNodes[groupId].content;

    for (var i = 0; i < childNodes.length; i++) {
      var tabId = Number(childNodes[i].getAttribute('tabId'));
      if (tabId == activeTabId) {
        break;
      }
    }

    var newTabId = -1;
    var max = childNodes.length - 2;
    // check if at end or if tab not found
    if (i == 0 || i == childNodes.length) {
      var newGroupId = -1;
      var groupsLength = Object.keys(groupNodes).length;

      // check if at last tab in group and switch to next group
      var first = Object.keys(groupNodes)[0];
      if (groupId == first) {
        groupId = Object.keys(groupNodes)[groupsLength - 2];
      } else {
        var index = Object.keys(groupNodes).indexOf(groupId.toString());
        groupId = Object.keys(groupNodes)[index - 1];
      }
      childNodes = groupNodes[groupId].content.childNodes;
      const childNodesSize = Object.keys(childNodes).length - 2;
      newTabId = Number(childNodes[childNodesSize].getAttribute('tabId'));
    } else {
      newTabId = Number(childNodes[i - 1].getAttribute('tabId'));
    }

    setActiveTabNodeById(newTabId);
  } else if (e.key === 'Enter') {
    browser.tabs.update(getActiveTabId(), { active: true });
  }
}

async function createGroup(x = 75, y = 75) {
  const group = await groups.create();

  group.rect.x = (x - 75) / window.innerWidth;
  group.rect.y = (y - 75) / window.innerHeight;
  group.rect.w = 150 / window.innerWidth;
  group.rect.h = 150 / window.innerHeight;

  const groupElement = makeGroupNode(group);

  view.groupsNode.appendChild(groupElement);

  resizeGroups();

  groupElement.scrollIntoView({ behavior: 'smooth' });
}

async function tabCreated(tab) {
  if (view.windowId == tab.windowId) {
    makeTabNode(tab);
    updateTabNode(tab);
    updateFavicon(tab);

    // Wait for background script to assign this tab to a group
    let groupId;
    while (groupId === undefined) {
      groupId = await getGroupId(tab.id);
    }

    const group = groups.get(groupId);
    await insertTab(tab);
    updateGroupFit(group);
  }
}

function tabRemoved(tabId, removeInfo) {
  if (view.windowId == removeInfo.windowId && view.tabId != tabId) {
    deleteTabNode(tabId);
    groups.forEach((group) => {
      updateGroupFit(group);
    });
  }
}

async function tabUpdated(tabId, changeInfo, tab) {
  updateTabNode(tab);
  updateFavicon(tab);

  if ('pinned' in changeInfo) {
    // FIXME for some reason the pinned tabs aren't updating reliably.
    // putting a temporary reload trigger in until someone can figure out why that's happening
    queueReload();

    fillGroupNodes();
    updateTabNode(tab);
  }
}

async function tabAttached(tabId, attachInfo) {
  if (view.windowId == attachInfo.newWindowId) {
    const tab = await browser.tabs.get(tabId);
    tabCreated(tab);
  }
}

function tabDetached(tabId, detachInfo) {
  if (view.windowId == detachInfo.oldWindowId) {
    console.log('delete node', tabId);
    deleteTabNode(tabId); // something really weird is happening here...
    groups.forEach((group) => {
      updateGroupFit(group);
    });
  }
}
