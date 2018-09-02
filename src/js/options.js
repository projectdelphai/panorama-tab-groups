
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

const toggle = 'toggle-panorama-view';
const nextView = 'activate-next-group';

async function init() {
    let commands = await browser.commands.getAll();
    for (command of commands) {
        if (command.name === toggle) {
            document.querySelector('#toggleView').value = command.shortcut;
        }
        if (command.name === nextView) {
            document.querySelector('#nextView').value = command.shortcut;
        }
    }
}

async function updateToggle() {
    await browser.commands.update({
        name: toggle,
        shortcut: document.querySelector('#toggleView').value
    });
}

async function updateNextView() {
    await browser.commands.update({
        name: nextView,
        shortcut: document.querySelector('#nextView').value
    });
}

async function resetToggle() {
    await browser.commands.reset(toggle);
    init();
}

async function resetNextView() {
    await browser.commands.reset(nextView);
    init();
}

document.addEventListener('DOMContentLoaded', init);
document.querySelector('#updateToggle').addEventListener('click', updateToggle);
document.querySelector('#updateNextView').addEventListener('click', updateNextView);
document.querySelector('#resetToggle').addEventListener('click', resetToggle);
document.querySelector('#resetNextView').addEventListener('click', resetNextView);
