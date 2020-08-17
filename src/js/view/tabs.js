export async function setGroupId(tabId, groupId) {
  await browser.sessions.setTabValue(tabId, 'groupId', parseInt(groupId));
}

export async function getGroupId(tabId) {
  return browser.sessions.getTabValue(tabId, 'groupId');
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

export async function getAllTabsInWindow() {
  return await browser.tabs.query({ currentWindow: true });
}
