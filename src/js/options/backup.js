import { currentOptions } from '../_share/options.js';

function convertBackup(tgData) {
  const data = {
    file: {
      type: 'panoramaView',
      version: 1,
    },
    windows: [],
  };

  tgData.windows.forEach((wi, index) => {
    const tabviewGroup = JSON.parse(wi.extData['tabview-group']);
    const tabviewGroups = JSON.parse(wi.extData['tabview-groups']);

    data.windows[index] = {
      groups: [],
      tabs: [],
      activeGroup: tabviewGroups.activeGroupId,
      groupIndex: tabviewGroups.nextID,
      position: {},
    };
    data.windows[wi].position = {
      left: wi.screenX,
      top: wi.screenY,
      height: wi.height,
      width: wi.width,
    };

    const nGroups = Object.keys(tabviewGroup).length;
    const gwidth = 0.25;
    let curX = 0.0;
    const deltaX = 1 / (nGroups < 4 ? 4 : nGroups + 1);
    let curY = 0.0;
    const deltaY = 1 / 32;
    tabviewGroup.forEach((gkey) => {
      data.windows[index].groups.push({
        id: gkey.id,
        name: gkey.title,
        rect: {
          x: curX, y: curY, w: gwidth, h: 0.5,
        },
      });
      curX += deltaX;
      curY += deltaY;
    });

    wi.tabs.forEach((tab, tIndex) => {
      let groupId;
      if (tab.pinned === true) {
        groupId = 0;
      } else if (tab.extData) {
        groupId = JSON.parse(tab.extData['tabview-tab']).groupID;
      } else {
        // No associated groupId, where should it go???
        console.log(`Skipping tab with missing groupId: ${tab.entries[0].url}`);
        return;
      }
      data.windows[index].tabs.push({
        url: tab.entries[0].url,
        title: tab.entries[0].title,
        groupId,
        index: Number(tIndex),
        lastAccessed: tab.lastAccessed,
        pinned: tab.pinned,
      });
    });
  });

  return data;
}

function getGroupIdsFromTabs(window) {
  const allGroupIds = [];
  window.tabs.forEach((tab) => {
    allGroupIds.push(tab.groupId);
  });

  const uniqueGroupIds = [...new Set(allGroupIds)];
  return uniqueGroupIds;
}

async function openBackup(data) {
  const background = browser.extension.getBackgroundPage();

  background.backgroundState.openingBackup = true;

  data.windows.forEach(async (wi) => {
    const groups = [];

    if (wi.groups.length === 0) {
      console.log('no groups in backup, trying to retrieve them from tabs');
      const newGroupIds = getGroupIdsFromTabs(wi);

      // TODO: eval rect by minimum size and fit it optimally on screen

      let curX = 0.0;
      const delta = 1 / newGroupIds.length;

      for (let i = 0; i < newGroupIds.length; i += 1) {
        const gId = newGroupIds[i];
        wi.groups.push({
          id: gId,
          name: `Group ${gId}`,
          rect: {
            x: curX,
            y: 0,
            w: delta,
            h: 0.5,
          },
        });
        curX += delta;
      }
    }

    wi.groups.forEach((gi) => {
      groups.push({
        id: gi.id,
        name: gi.name,
        containerId: 'firefox-default',
        rect: gi.rect,
        tabCount: 0,
      });
    });

    let windata = {};
    if (wi.position) {
      windata = wi.position;
    }
    const window = await browser.windows.create({});
    await browser.windows.update(window.id, windata);

    await browser.sessions.setWindowValue(window.id, 'groups', groups);
    await browser.sessions.setWindowValue(window.id, 'activeGroup', wi.activeGroup);
    await browser.sessions.setWindowValue(window.id, 'groupIndex', wi.groupIndex);

    wi.tabs.forEach(async (ti) => {
      // pinned tabs are not allowed to be discarded
      let bdiscarded;
      if (ti.pinned === true) {
        bdiscarded = false;
      } else {
        bdiscarded = true;
      }

      const tab = await browser.tabs.create({
        url: ti.url,
        active: false,
        discarded: bdiscarded,
        windowId: window.id,
        pinned: ti.pinned,
      }).catch((err) => { console.log(err); });

      if (tab) {
        await browser.sessions.setTabValue(tab.id, 'groupId', parseInt(ti.groupId, 10));
        // await browser.tabs.discard(tab.id);
      }
    });

    if ((await currentOptions).view === 'freeform') {
      // Show freeform view
      const freeformViewTab = await browser.tabs.create({
        url: '/view.html',
        active: true,
        windowId: window.id,
      });
      await browser.sessions.setTabValue(freeformViewTab.id, 'groupId', -1);
    } else {
      // Remove the "New tab"-tab
      const activeNewTabs = await browser.tabs.query({
        windowId: window.id,
        active: true,
      });
      if (activeNewTabs.length === 1) {
        await browser.tabs.remove(activeNewTabs[0].id);
      }
    }
  });
  background.backgroundState.openingBackup = false;
}

export function loadBackup(input) {
  const file = input.target.files[0];

  if (file.type === 'application/json') {
    const reader = new FileReader();

    reader.onload = function parseJSON(json) {
      let data = JSON.parse(json.target.result);

      // panorama view backup
      if (data.file && data.file.type === 'panoramaView' && data.file.version === 1) {

        // nothing to do..

        // if it's a tab groups backup
      } else if (((data.version && data.version[0] === 'tabGroups') || (data.version && data.version[0] === 'sessionrestore')) && data.version[1] === 1) {
        data = convertBackup(data);
      } else {
        alert('Invalid file');
        return;
      }

      // console.log(JSON.stringify(data, null, 4));
      openBackup(data);
    };

    reader.readAsText(file);
  } else {
    alert('Invalid file');
  }
}

function makeDateString() {
  const pad = function padNum(num) {
    const s = `00${num}`;
    return s.substr(-2);
  };

  const date = new Date();
  let string = '';

  string += pad(date.getFullYear());
  string += pad(date.getMonth() + 1);
  string += pad(date.getDate());
  string += '-';
  string += pad(date.getHours());
  string += pad(date.getMinutes());
  string += pad(date.getSeconds());

  return string;
}

export async function saveBackup() {
  const data = {
    file: {
      type: 'panoramaView',
      version: 1,
    },
    windows: [],
  };

  const windows = await browser.windows.getAll({});

  windows.forEach(async (wi, index) => {
    const groups = await browser.sessions.getWindowValue(wi.id, 'groups');
    const groupIndex = await browser.sessions.getWindowValue(wi.id, 'groupIndex');
    const activeGroup = await browser.sessions.getWindowValue(wi.id, 'activeGroup');

    data.windows[index] = {
      groups: [], tabs: [], activeGroup, groupIndex,
    };

    groups.forEach((gi) => {
      data.windows[index].groups.push({
        id: gi.id,
        name: gi.name,
        rect: gi.rect,
      });
    });

    const tabs = await browser.tabs.query({ windowId: wi.id });
    tabs.forEach(async (tab) => {
      const groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

      if (groupId !== -1) {
        data.windows[index].tabs.push({
          url: tab.url,
          title: tab.title,
          groupId,
          index: tab.index,
          lastAccessed: tab.lastAccessed,
          pinned: tab.pinned,
        });
      }
    });
  });

  const blob = new Blob([JSON.stringify(data, null, '\t')], { type: 'application/json' });
  const dataUrl = window.URL.createObjectURL(blob);

  const filename = `panoramaView-backup-${makeDateString()}.json`;

  await browser.downloads.download({
    url: dataUrl,
    filename,
    conflictAction: 'uniquify',
    saveAs: true,
  });
}
