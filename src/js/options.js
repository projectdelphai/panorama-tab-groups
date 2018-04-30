
function new_element(name, attributes, children) {

	const e = document.createElement(name);

	for(const key in attributes) {
		if(key == 'content') {
			e.appendChild(document.createTextNode(attributes[key]));
		}else{
			e.setAttribute(key.replace(/_/g, '-'), attributes[key]);
		}
	}

	for(const child of children || []) {
		e.appendChild(child);
	}

	return e;
}

function formatByteSize(bytes) {
	if(bytes < 1024) return bytes + " bytes";
	else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
	else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
	else return(bytes / 1073741824).toFixed(3) + " GiB";
};

async function getStatistics() {

	const tabs = await browser.tabs.query({});

	var totalSize = 0;
	var numActiveTabs = 0;

	for(const tab of tabs) {

		var thumbnail = await browser.sessions.getTabValue(tab.id, 'thumbnail');

		if(thumbnail) {
			totalSize += thumbnail.length;
		}
		if(!tab.discarded) {
			numActiveTabs++;
		}
	}

	document.getElementById('thumbnailCacheSize').innerHTML = '';
	document.getElementById('thumbnailCacheSize').appendChild(document.createTextNode(formatByteSize(totalSize)));

	document.getElementById('numberOfTabs').innerHTML = '';
	document.getElementById('numberOfTabs').appendChild(document.createTextNode(tabs.length + ' (Active: ' + numActiveTabs + ')'));
}

/*function changeTheme() {
	var tabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});

	if(tabs.length > 0) {
		browser.tabs.sendMessage(tabs[0].id, JSON.stringify({name: 'updateThumbnail', value: tabId}));
	};
}*/

async function init() {

	var commands = await browser.commands.getAll();
	var fragment = document.createDocumentFragment();

	for(var i in commands) {
		var key = new_element('button', {content: commands[i].shortcut, disabled: true, title: 'Will be customizable from Firefox v60'}, [])
		var label = new_element('label', {content: commands[i].description, for: key}, []);

		var commandNode = new_element('div', {}, [label, key]);
		fragment.appendChild(commandNode);
	}
	document.getElementById('keyboardShortcuts').appendChild(fragment);

	getStatistics();

	document.getElementById('backupFileInput').addEventListener('change', loadBackup);
	document.getElementById('saveBackupButton').addEventListener('click', saveBackup);
}

document.addEventListener('DOMContentLoaded', init);
