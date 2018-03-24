
'use strict';

var groupNodes = {};

async function initGroupNodes() {

	groups.forEach(function(group) {
		makeGroupNode(group);
		view.groupsNode.appendChild(groupNodes[group.id].group);

		// readjust group name input element
		groupNodes[group.id].input.style.width = groupNodes[group.id].name.getBoundingClientRect().width + 'px';
	});
	fillGroupNodes();
}

function makeGroupNode(group) {

	// edges
	var top = new_element('div', {class: 'top'});
	var right = new_element('div', {class: 'right'});
	var bottom = new_element('div', {class: 'bottom'});
	var left = new_element('div', {class: 'left'});

	// corners
	var top_right = new_element('div', {class: 'top_right'});
	var bottom_right = new_element('div', {class: 'bottom_right'});
	var bottom_left = new_element('div', {class: 'bottom_left'});
	var top_left = new_element('div', {class: 'top_left'});

	// header
	var name = new_element('span', {class: 'name', content: group.name});
	var input = new_element('input', {type: 'text', value: group.name});

	var tabCount = new_element('span', {class: 'tab_count', content: group.tabCount});

	var close = new_element('div', {class: 'close'});

	var header = new_element('div', {class: 'header'}, [name, input, tabCount, close]);

	// newtab
	var newtab = new_element('div', {class: 'newtab'}, [new_element('div', {class: 'inner'})]);

	// group
	var content = new_element('div', {class: 'content transition', groupId: group.id}, [newtab]);
	content.addEventListener('dragover', groupDragOver, false);
	content.addEventListener('drop', groupDrop, false);

	var node = new_element('div', {class: 'group'}, [top, right, bottom, left, top_right, bottom_right, bottom_left, top_left, header, content]);

	close.addEventListener('click', function(event) {
		event.stopPropagation();

		var childNodes = content.childNodes;
		var tabCount = childNodes.length-1;

		if(tabCount > 0) {
			if(window.confirm('Closing this Group will close the ' + tabCount + ' tab' + (tabCount == 1 ? '' : 's') + ' within it')) {
				groups.remove(group.id);
				removeGroupNode(group.id);

				view.tabs.forEach(async function(tab) {
					var groupId = await view.tabs.getGroupId(tab.id);
					if(groupId == group.id) {
						browser.tabs.remove(tab.id);
					}
				});
				var first = true;
				groups.forEach(function(g) {
					if(first) {
						groups.setActive(g.id);
					}
				});
			}
		}else{
			groups.remove(group.id);
			removeGroupNode(group.id);
		}
	}, false);

	content.addEventListener('click', function(event) {
		event.stopPropagation();
	}, false);

	newtab.addEventListener('click', async function(event) {
		event.stopPropagation();
		await groups.setActive(group.id);
		await browser.tabs.create({active: true});
	}, false);

	// renaming groups
	input.addEventListener('input', function() {
		name.innerHTML = '';
		name.appendChild(document.createTextNode(this.value));

		input.style.width = name.getBoundingClientRect().width + 'px';
	}, false);

	input.addEventListener('focus', function(event) {
		event.stopPropagation();

		input.classList.add('edit');

		input.addEventListener('keydown', function(event) {
			 if(event.keyCode == 13) {
				input.blur();
			}
		}, false);
	}, false);

	input.addEventListener('blur', function(event) {
		input.classList.remove('edit');
		input.setSelectionRange(0, 0);
		groups.rename(group.id, this.value);
	}, false);
	// ----

	// move
	header.addEventListener('mousedown', function(event) {
		//event.preventDefault();
		event.stopPropagation();
	}, false);

	// resize
	top.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	right.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	bottom.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	left.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	top_right.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	bottom_right.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	bottom_left.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	top_left.addEventListener('mousedown', function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	groupNodes[group.id] = {
		group: node,
		content: content,
		newtab: newtab,
		tabCount: tabCount,
		name: name,
		input: input
	};
}

function removeGroupNode(groupId) {
	groupNodes[groupId].group.parentNode.removeChild(groupNodes[groupId].group);
	delete groupNodes[groupId];
}

function getBestFit(param){

	var hmax = Math.floor(param.width / param.minWidth);
	var hmin = Math.ceil(param.width / param.maxWidth);
	var vmax = Math.floor(param.height / (param.minWidth * param.ratio));
	var vmin = Math.floor(param.height / (param.maxWidth * param.ratio));

	var area = param.minWidth * (param.minWidth * param.ratio);
	var tmp_area;
	var tmpx = -1;
	var tmpy = -1;

	for(var y = vmin; y <= vmax; y++) {
		for(var x = hmin; x <= hmax; x++) {
			if((x * y) >= param.amount) {

				var w = (param.width / x);
				var h = ((param.width / x) * param.ratio);

				if((h * y) <= param.height){
					tmp_area = w * h;

					if(tmp_area > area) {
						area = tmp_area;
						tmpx = x;
						tmpy = y;
					}
				}
			}
		}
	}
	return {x: tmpx, y: tmpy};
}

async function fillGroupNodes() {
	var fragment = {};

	groups.forEach(function(group) {
		fragment[group.id] = document.createDocumentFragment();
	});

	await view.tabs.forEach(async function(tab) {
		var groupId = await view.tabs.getGroupId(tab.id);
		if(groupId != -1 && fragment[groupId]) {
			fragment[groupId].appendChild(tabNodes[tab.id].tab);
		}
	});

	groups.forEach(function(group) {
		groupNodes[group.id].content.insertBefore(fragment[group.id], groupNodes[group.id].newtab);
		updateGroupFit(group);
	});
}

async function insertTab(tab) {

	var groupId = await view.tabs.getGroupId(tab.id);

	if(groupId != -1) {

		var index = 0;

		var childNodes = groupNodes[groupId].content.childNodes;

		for(var i = 0; i < childNodes.length-1; i++) {

			var _tabId = Number(childNodes[i].getAttribute('tabId'));
			var _tab = await browser.tabs.get(_tabId);

			if(_tab.index >= tab.index) {
				break;
			}
			index++;
		}

		var tabNode = tabNodes[tab.id];

		if(index < childNodes.length-1) {
			childNodes[index].insertAdjacentElement('beforebegin', tabNode.tab);
		}else{
			groupNodes[groupId].newtab.insertAdjacentElement('beforebegin', tabNode.tab);
		}
	}
}

function updateGroupFit(group) {

	var node = groupNodes[group.id];
	var childNodes = node.content.childNodes;

	node.tabCount.innerHTML = '';
	node.tabCount.appendChild(document.createTextNode(childNodes.length-1));

	// fit
	var rect = node.content.getBoundingClientRect();

	var ratio = 0.68;
	var small = false;

	var fit = getBestFit({
		width: rect.width,
		height: rect.height,

		minWidth: 100,
		maxWidth: 250,

		ratio: ratio,

		amount: childNodes.length,
	});

	if(fit.x == -1 || fit.y == -1){
		ratio = 1;
		small = true;

		fit = getBestFit({
			width: rect.width,
			height: rect.height,

			minWidth: 50,
			maxWidth: 99,

			ratio: ratio,

			amount: childNodes.length,
		});
	}

	// this should be the deck view
	if(fit.x == -1 || fit.y == -1){
		fit = {
			x: 11,
			y: 10,
		}
	}

	var index = 0;

	var w = rect.width  / fit.x;
	var h = w * ratio;

	for(var i = 0; i < childNodes.length; i++) {
		if(small) {
			childNodes[i].classList.add('small');
		}else{
			childNodes[i].classList.remove('small');
		}

		childNodes[i].style.width = w + 'px';
		childNodes[i].style.height = h + 'px';
		childNodes[i].style.left = (w * (index % fit.x)) + 'px';
		childNodes[i].style.top = (h * Math.floor(index / fit.x)) + 'px';

		index++;
	}

}
