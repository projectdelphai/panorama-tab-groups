export async function setGroupId(tabId, groupId) {
  await browser.sessions.setTabValue(tabId, 'groupId', parseInt(groupId, 10));
}

export async function getGroupId(tabId) {
  return browser.sessions.getTabValue(tabId, 'groupId');
}

export async function getAllTabsInWindow() {
  return browser.tabs.query({ currentWindow: true });
}

export async function forEachTab(callback) {
  const tabs = await getAllTabsInWindow();
  for (const tab of tabs) {
    await callback(tab);
  }
}

export async function forEachTabSync(callback) {
  const tabs = await getAllTabsInWindow();
  for (const tab of tabs) {
    callback(tab);
  }
}
