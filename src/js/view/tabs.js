
export async function setGroupId(tabId, groupId) {
	await browser.sessions.setTabValue(tabId, 'groupId', groupId);
};

export async function getGroupId(tabId) {
	return browser.sessions.getTabValue(tabId, 'groupId');
};

export async function forEachTab(callback) {
	const tabs = await browser.tabs.query({currentWindow: true});

	await Promise.all(tabs.map(callback));
};
