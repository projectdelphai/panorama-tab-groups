
'use strict';

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

var background = browser.extension.getBackgroundPage();

var view = {
	windowId: -1,
	tabId: -1,
	groupsNode: null,
	dragIndicator: null,

	screenshotInterval: null,

	tabs: {},
};

async function captureTabs() {
	console.log('capture tabs');
	/*view.tabs.forEach(async function(tab) {
		if(!tab.discarded) {
			console.log(tab.title);
		}
	});*/
}

async function initView() {

	view.windowId = (await browser.windows.getCurrent()).id;
	view.tabId = (await browser.tabs.getCurrent()).id;
	view.groupsNode = document.getElementById('groups');

	view.dragIndicator = new_element('div', {class: 'drag_indicator'});
	view.groupsNode.appendChild(view.dragIndicator);

	await groups.init();

	// init Nodes
	await initTabNodes();
	await initGroupNodes();

	// set all listeners
	document.getElementById('newGroup').addEventListener('click', createGroup, false);

	document.getElementById('groups').addEventListener('auxclick', async function(event) {
		event.preventDefault();
		event.stopPropagation();

		if ( event.target != document.getElementById('groups') ) return; // ignore middle clicks in foreground
		if ( event.button != 1 ) return; // middle mouse

		createGroup();
	}, false);

	/*document.addEventListener('visibilitychange', function handleVisibilityChange() {
		if(document.hidden) {
			clearInterval(view.screenshotInterval);
		}else{
			view.screenshotInterval = setInterval(captureTabs, 1000);
		}
	}, false);*/

	browser.runtime.onMessage.addListener(function(message) {
		message = JSON.parse(message);
		if(message.name == 'updateThumbnail') {
			updateThumbnail(message.value);
		}
	});

	browser.tabs.onCreated.addListener(tabCreated);
	browser.tabs.onRemoved.addListener(tabRemoved);

	browser.tabs.onUpdated.addListener(tabUpdated);
	browser.tabs.onMoved.addListener(tabMoved);

	browser.tabs.onAttached.addListener(tabAttached);
	browser.tabs.onDetached.addListener(tabDetached);

	browser.tabs.onActivated.addListener(tabActivated);
}


document.addEventListener('DOMContentLoaded', initView, false);


async function createGroup() {
	var group = await groups.create();
	makeGroupNode(group);
	var groupElement = groupNodes[group.id].group
	view.groupsNode.appendChild(groupElement);
	updateGroupFit(group);
	groupElement.scrollIntoView({behavior: "smooth"});
}


async function tabCreated(tab) {
	if(view.windowId == tab.windowId){
		makeTabNode(tab);
		updateTabNode(tab);
		updateFavicon(tab);

		var groupId = undefined;

		while(groupId === undefined) {
			groupId = await view.tabs.getGroupId(tab.id);
		}

		var group = groups.get(groupId);
		await insertTab(tab);
		updateGroupFit(group);
	}
}

function tabRemoved(tabId, removeInfo) {
	if(view.windowId == removeInfo.windowId && view.tabId != tabId){
		deleteTabNode(tabId);
		groups.forEach(function(group) {
			updateGroupFit(group);
		});
	}
}

async function tabUpdated(tabId, changeInfo, tab) {
	if(view.windowId == tab.windowId){
		updateTabNode(tab);
		updateFavicon(tab);
	}
}

async function tabMoved(tabId, moveInfo) {
	if(view.windowId == moveInfo.windowId){
		browser.tabs.get(tabId).then(async function(tab) {
			await insertTab(tab);
			groups.forEach(async function(group) {
				updateGroupFit(group);
			});
		});
	}
}

function tabAttached(tabId, attachInfo) {
	console.log('tab attached', attachInfo.newWindowId);
	if(view.windowId == attachInfo.newWindowId){
		browser.tabs.get(tabId).then(tab => {
			tabCreated(tab);
		});
	}
}

function tabDetached(tabId, detachInfo) {
	console.log('tab detached', detachInfo.oldWindowId);
	if(view.windowId == detachInfo.oldWindowId){
		deleteTabNode(tabId);
		groups.forEach(function(group) {
			updateGroupFit(group);
		});
	}
}

async function tabActivated(activeInfo) {
	setActiveTabNode();
}
