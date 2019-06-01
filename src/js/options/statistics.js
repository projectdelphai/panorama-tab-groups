import { formatByteSize } from '../_share/utils.js';

export async function getStatistics() {
	const tabs = await browser.tabs.query({});

	let totalSize = 0;
	let numActiveTabs = 0;

	for(const tab of tabs) {
		const thumbnail = await browser.sessions.getTabValue(tab.id, 'thumbnail');

		if (thumbnail) {
			if (thumbnail.thumbnail){
				totalSize += thumbnail.thumbnail.length;
			} else {
				totalSize += thumbnail.length;
			}
		}
		if(!tab.discarded) {
			numActiveTabs++;
		}
	}

	document.getElementById('thumbnailCacheSize').innerHTML = '';
	document.getElementById('thumbnailCacheSize').appendChild(document.createTextNode(formatByteSize(totalSize)));

	document.getElementById('numberOfTabs').innerHTML = '';
	document.getElementById('numberOfTabs').appendChild(document.createTextNode(
		`${tabs.length} (${browser.i18n.getMessage('optionsStatisticsNumberOfTabsActive')} ${numActiveTabs})`)
	);
}