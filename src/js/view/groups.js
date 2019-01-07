var windowId;
var groups;

async function save() {
	await browser.sessions.setWindowValue(windowId, 'groups', groups);
}

async function newUid() {
	var groupIndex = (await browser.sessions.getWindowValue(windowId, 'groupIndex'));

	var uid = groupIndex || 0;
	var newGroupIndex = uid + 1;

	await browser.sessions.setWindowValue(windowId, 'groupIndex', newGroupIndex);

	return uid;
}

function getIndex(id) {
	for(var i in groups) {
		if(groups[i].id == id) {
			return i;
		}
	}
	return -1;
}

export async function init() {

	windowId = (await browser.windows.getCurrent()).id;
	groups = (await browser.sessions.getWindowValue(windowId, 'groups'));

	for(var i in groups) {
		groups[i].tabCount = 0;
	}
};

export async function create() {
	var group = {
		id: await newUid(),
		name: browser.i18n.getMessage("defaultGroupName"),
		windowId: windowId,
		containerId: 'firefox-default',
		rect: {x: 0, y: 0, w: 0.2, h: 0.2},
		lastMoved: (new Date).getTime(),
	};
	groups.push(group);

	await save();

	return group;
};

export async function remove(id) {
	var index = getIndex(id);
	if(index == -1) {
		return;
	}
	groups.splice(index, 1);

	await save();
};

export async function rename(id, newName) {
	var index = getIndex(id);
	if(index == -1) {
		return;
	}
	groups[index].name = newName;

	await save();
};

export async function transform(id, rect) {
	var index = getIndex(id);
	if(index == -1) {
		return;
	}

	groups[index].rect = rect;
	groups[index].lastMoved = (new Date).getTime();

	await save();
};

export async function getActive() {
	return await browser.sessions.getWindowValue(windowId, 'activeGroup');
};

export async function setActive(id) {
	await browser.sessions.setWindowValue(windowId, 'activeGroup', id);
};

export function get(id) {
	var index = getIndex(id);
	if(index == -1) {
		return;
	}
	return groups[index];
};

export function forEach(callback) {
	for(var i in groups) {
		callback(groups[i]);
	}
};
