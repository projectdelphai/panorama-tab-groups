let windowId;
let groups;

async function save() {
  await browser.sessions.setWindowValue(windowId, 'groups', groups);
}

async function newUid() {
  const groupIndex = (await browser.sessions.getWindowValue(windowId, 'groupIndex'));

  const uid = groupIndex || 0;
  const newGroupIndex = uid + 1;

  await browser.sessions.setWindowValue(windowId, 'groupIndex', newGroupIndex);

  return uid;
}

function getIndex(id) {
  let letVal = -1;
  groups.forEach((group, index) => {
    if (group.id === id) {
      letVal = index;
    }
  });
  return letVal;
}

export function getLength() {
  let length = 0;
  groups.forEach(() => { length += 1; });
  return length;
}

export function getName(id) {
  let retVal;
  groups.forEach((group) => {
    if (group.id === id) {
      retVal = group.name;
    }
  });
  return retVal;
}

export async function init() {
  windowId = (await browser.windows.getCurrent()).id;
  groups = (await browser.sessions.getWindowValue(windowId, 'groups')) || [];

  groups.forEach((group) => {
    group.tabCount = 0;
  });
}

export async function create() {
  const newId = await newUid();
  const newName = browser.i18n.getMessage('defaultGroupName');
  const group = {
    id: newId,
    name: newName,
    windowId,
    containerId: 'firefox-default',
    rect: {
      x: 0, y: 0, w: 0.2, h: 0.2,
    },
    lastMoved: (new Date()).getTime(),
  };
  groups.push(group);
  browser.runtime.sendMessage({ action: 'createMenuItem', groupId: newId.toString(), groupName: newName });

  await save();

  return group;
}

export async function remove(id) {
  const index = getIndex(id);
  if (index === -1) {
    return;
  }
  groups.splice(index, 1);
  browser.runtime.sendMessage({ action: 'removeMenuItem', groupId: id.toString() });

  await save();
}

export async function rename(id, newName) {
  const index = getIndex(id);
  if (index === -1) {
    return;
  }
  groups[index].name = newName;
  browser.runtime.sendMessage({ action: 'updateMenuItem', groupId: id.toString(), groupName: newName });

  await save();
}

export async function transform(id, rect) {
  const index = getIndex(id);
  if (index === -1) {
    return;
  }

  groups[index].rect = rect;
  groups[index].lastMoved = (new Date()).getTime();

  await save();
}

export async function getActive() {
  return browser.sessions.getWindowValue(windowId, 'activeGroup');
}

export async function setActive(id) {
  await browser.sessions.setWindowValue(windowId, 'activeGroup', id);
}

export function get(id) {
  const index = getIndex(id);
  if (index === -1) {
    // should properly throw error here.
    return null;
  }
  return groups[index];
}

export function getIds() {
  const arr = [];
  groups.forEach((group) => {
    arr.push(group.id);
  });
  return arr;
}

// confused why this is necessary tbh
export function forEach(callback) {
  // for (const i in groups) {
  groups.forEach((group, i) => {
    callback(groups[i]);
  });
}
