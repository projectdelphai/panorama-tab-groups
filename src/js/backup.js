
function convertBackup(tgData) {

	var data = {
		file: {
			type: 'panoramaView',
			version: 1
		},
		windows: []
	};

	for(var wi in tgData.windows) {

		const tabviewGroup = JSON.parse(tgData.windows[wi].extData['tabview-group']);
		const tabviewGroups = JSON.parse(tgData.windows[wi].extData['tabview-groups']);

		data.windows[wi] = {groups: [], tabs: [], activeGroup: tabviewGroups.activeGroupId, groupIndex: tabviewGroups.nextID};

		for(const gkey in tabviewGroup) {
			data.windows[wi].groups.push({
				id: tabviewGroup[gkey].id,
				name: tabviewGroup[gkey].title,
				rect: {x: 0, y: 0, w: 0.25, h: 0.5},
			});
		}

		for(const ti in tgData.windows[wi].tabs) {

			var tab = tgData.windows[wi].tabs[ti];
			if(tab.pinned == true) {
				var groupId = 0;
			}else{
				var groupId = JSON.parse(tab.extData['tabview-tab']).groupID;
			}
			data.windows[wi].tabs.push({
				url: tab.entries[0].url,
				title: tab.entries[0].title,
				groupId: groupId,
				index: Number(ti),
				lastAccessed: tab.lastAccessed,
				pinned: tab.pinned,
			});
		}
	}

	return data;
}

var background = browser.extension.getBackgroundPage()

function getGroupIdsFromTabs(window) {
	var allGroupIds = [];
	for(var ti in window.tabs) {
		allGroupIds.push(window.tabs[ti].groupId);
	}
	
	let uniqueGroupIds = [...new Set(allGroupIds)];
	return uniqueGroupIds;
}

async function openBackup(data) {

	background.openingBackup = true;

	for(var wi in data.windows) {

		var groups = [];

		if(data.windows[wi].groups.length === 0) {
			console.log('no groups in backup, trying to retrieve them from tabs');
			var newGroupIds = getGroupIdsFromTabs(data.windows[wi]);

			// TODO: eval rect by minimum size and fit it optimally on screen

			var curX = 0.0;
			var delta = 1 / newGroupIds.length;

			for(var i = 0; i < newGroupIds.length; i++) {
				var gId = newGroupIds[i];
				data.windows[wi].groups.push({
					id: gId,
					name: `Group ${gId}`,
					rect: {
						x: curX,
						y: 0,
						w: delta,
						h: 0.5
					}
				});
				curX += delta;
			}
		}

		for(var gi in data.windows[wi].groups) {
			groups.push({
				id: data.windows[wi].groups[gi].id,
				name: data.windows[wi].groups[gi].name,
				containerId: 'firefox-default',
				rect: data.windows[wi].groups[gi].rect,
				tabCount: 0,
			});
		}

		const window = await browser.windows.create({});

		await browser.sessions.setWindowValue(window.id, 'groups', groups);
		await browser.sessions.setWindowValue(window.id, 'activeGroup', data.windows[wi].activeGroup);
		await browser.sessions.setWindowValue(window.id, 'groupIndex', data.windows[wi].groupIndex);

		for(var ti in data.windows[wi].tabs) {
			// pinned tabs are not allowed to be discarded
			if (data.windows[wi].tabs[ti].pinned == true) {
				var bdiscarded = false;
			} else {
				var bdiscarded = true;
			}
			
			var tab = await browser.tabs.create({
				url: data.windows[wi].tabs[ti].url,
				active: false,
				discarded: bdiscarded,
				windowId: window.id,
				pinned: data.windows[wi].tabs[ti].pinned,
			}).catch((err) => { console.log(err); });

			if(tab) {
				await browser.sessions.setTabValue(tab.id, 'groupId', data.windows[wi].tabs[ti].groupId);
				//await browser.tabs.discard(tab.id);
			}
		}

		var pwTab = await browser.tabs.create({url: "/view.html", active: true, windowId: window.id});
		await browser.sessions.setTabValue(pwTab.id, 'groupId', -1);
	}
	background.openingBackup = false;
}

function loadBackup(input) {

	const file = input.target.files[0];

	if(file.type == 'application/json') {

		const reader = new FileReader();

		reader.onload = function(json) {
			var data = JSON.parse(json.target.result);

			// panorama view backup
			if(data.file && data.file.type == 'panoramaView' && data.file.version == 1) {

				// nothing to do..

			// if it's a tab groups backup
			}else if((data.version && data.version[0] == 'tabGroups' || data.version && data.version[0] == 'sessionrestore') && data.version[1] == 1) {
				data = convertBackup(data);
			}else{
				alert('Invalid file');
				return;
			}

			//console.log(JSON.stringify(data, null, 4));
			openBackup(data);
		};

		reader.readAsText(file);
	}else{
		alert('Invalid file');
	}
}

function makeDateString() {

	var pad = function(num) {
		var s = '00' + num;
		return s.substr(-2);
	};

	var date = new Date();
	var string = '';

	string += pad(date.getFullYear());
	string += pad(date.getMonth() + 1);
	string += pad(date.getDate());
	string += '-';
	string += pad(date.getHours());
	string += pad(date.getMinutes());
	string += pad(date.getSeconds());

	return string;
}

async function saveBackup() {

	var data = {
		file: {
			type: 'panoramaView',
			version: 1
		},
		windows: []
	};

	const windows = await browser.windows.getAll({});

	for(const wi in windows) {

		const groups = await browser.sessions.getWindowValue(windows[wi].id, 'groups');
		const groupIndex = await browser.sessions.getWindowValue(windows[wi].id, 'groupIndex');
		const activeGroup = await browser.sessions.getWindowValue(windows[wi].id, 'activeGroup');

		data.windows[wi] = {groups: [], tabs: [], activeGroup: activeGroup, groupIndex: groupIndex};

		for(const gi in groups) {
			data.windows[wi].groups.push({
				id: groups[gi].id,
				name: groups[gi].name,
				rect: groups[gi].rect,
			});
		}

		const tabs = browser.tabs.query({windowId: windows[wi].id});
		for(const tab of await tabs) {

			var groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

			if(groupId != -1) {
				data.windows[wi].tabs.push({
					url: tab.url,
					title: tab.title,
					groupId: groupId,
					index: tab.index,
					lastAccessed: tab.lastAccessed,
					pinned: tab.pinned,
				});
			}
		}
	}

	var blob = new Blob([JSON.stringify(data, null, '\t')], {type : 'application/json'});
	var dataUrl = window.URL.createObjectURL(blob);

	var filename = 'panoramaView-backup-' + makeDateString() + '.json';

	await browser.downloads.download({
		url: dataUrl,
		filename: filename,
		conflictAction: 'uniquify',
		saveAs: true
	});
}
