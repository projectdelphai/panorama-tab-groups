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
  for (const i in groups) {
    if (groups[i].id === id) {
      return i;
    }
  }
  return -1;
}

export function getLength() {
  let length = 0;
  for (const i in groups) {
    length++;
  }
  return length;
}

export function getName(id) {
  for (const i in groups) {
    if (groups[i].id === id) {
      return groups[i].name;
    }
  }
  return null;
}

export async function init() {
  windowId = (await browser.windows.getCurrent()).id;
  groups = (await browser.sessions.getWindowValue(windowId, 'groups')) || [];

  for (const i in groups) {
    groups[i].tabCount = 0;
  }
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
  return await browser.sessions.getWindowValue(windowId, 'activeGroup');
}

export async function setActive(id) {
  await browser.sessions.setWindowValue(windowId, 'activeGroup', id);
}

export function get(id) {
  const index = getIndex(id);
  if (index === -1) {
    return;
  }
  return groups[index];
}

export function getIds() {
  const arr = [];
  for (const i in groups) {
    arr.push(groups[i].id);
  }
  return arr;
}

export function forEach(callback) {
  for (const i in groups) {
    callback(groups[i]);
  }
}
