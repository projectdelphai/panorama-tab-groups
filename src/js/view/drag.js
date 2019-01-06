import { setGroupId, getGroupId } from './tabs.js';
import { groupNodes, makeGroupNode, resizeGroups, updateGroupFit, insertTab } from './groupNodes.js';
import * as groups from './groups.js';
import { new_element } from './utils.js';

var dragTab = null;
var dragOverTab = null;
var dragCount = 0;
var dragDropBefore;
var dragIndicator;

export function createDragIndicator() {
	dragIndicator = new_element('div', {class: 'drag_indicator'});
	return dragIndicator;
}

export async function tabMoved(tabId, moveInfo) {
    var windowId = (await browser.windows.getCurrent()).id;
    if (windowId == moveInfo.windowId) {
        browser.tabs.get(tabId).then(async function(tab) {
            await insertTab(tab);
            groups.forEach(async function(group) {
                updateGroupFit(group);
            });
        });
    }
}

export function tabDragStart( e ) {
	if ( this.classList.contains( 'pinned' ) ) {
		e.preventDefault();
		return;
	}

	this.classList.add('drag');

	e.dataTransfer.effectAllowed = 'move';
	e.dataTransfer.setData('text/html', 'pvDragging');

	var rect = this.getBoundingClientRect();

	e.dataTransfer.setDragImage(this, rect.width/2, rect.height/2);

	dragTab = this;
}

export function tabDragEnter(e) {
	e.preventDefault();

	if(dragOverTab && this != dragOverTab) {
		dragIndicator.classList.remove('show');
		dragOverTab = this;
	}

	if(dragCount == 0) {
		dragOverTab = this;
	}
	dragCount++;
}

export function tabDragLeave(e) {
	e.preventDefault();

	dragCount--;
	if(dragCount == 0) {
		dragIndicator.classList.remove('show');
		dragOverTab = null;
	}
}

export function tabDragOver(e) {
	e.preventDefault();

	e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

	if(dragOverTab && dragTab != dragOverTab) {
		var rect = dragOverTab.getBoundingClientRect();

		dragIndicator.classList.add('show');
		dragIndicator.style.height = (rect.height - 8) + 'px';
		dragIndicator.style.top = (window.scrollY + rect.top) + 'px';

		if(e.clientX < rect.left+(rect.width/2)) {
			dragIndicator.style.left = (rect.left - 5) + 'px';
			dragDropBefore = true;
		}else{
			dragIndicator.style.left = (rect.left + rect.width - 5) + 'px';
			dragDropBefore = false;
		}
	}

	return false;
}

export async function tabDrop(e) {
	e.stopPropagation();

	if(dragTab !== dragOverTab) {
		if(dragDropBefore) {
			dragOverTab.insertAdjacentElement('beforebegin', dragTab);
		}else{
			dragOverTab.insertAdjacentElement('afterend', dragTab);
		}

		groups.forEach(function(group) {
			updateGroupFit(group);
		});

		var toTabId = Number(dragOverTab.getAttribute('tabId'));
		var groupId = await getGroupId(toTabId);

		var tabId = Number(dragTab.getAttribute('tabId'));
		setGroupId(tabId, groupId);


		var tab = await browser.tabs.get(tabId);
		var toTab = await browser.tabs.get(toTabId);

		var toIndex = Number(toTab.index);

		if(tab.index < toTab.index) {
			if(dragDropBefore) {
				toIndex--;
			}
		}else{
			if(!dragDropBefore) {
				toIndex++;
			}
		}

		browser.tabs.onMoved.removeListener(tabMoved);
		await browser.tabs.move(tabId, {index: toIndex});
		browser.tabs.onMoved.addListener(tabMoved);
	}

	return false;
}

export function groupDragOver(e) {
	e.preventDefault(); // Necessary. Allows us to drop.
	e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

	return false;
}

async function putTabInGroup(groupId) {
	groupNodes[groupId].newtab.insertAdjacentElement('beforebegin', dragTab);

	groups.forEach(function(group) {
		updateGroupFit(group);
	});

	var tabId = Number(dragTab.getAttribute('tabId'));
	setGroupId(tabId, groupId);

	var toIndex = -1;

	browser.tabs.onMoved.removeListener(tabMoved);
	await browser.tabs.move(tabId, {index: toIndex});
	browser.tabs.onMoved.addListener(tabMoved);
}

export async function outsideDrop(e) {
        e.stopPropagation();

        var group = await groups.create();
        makeGroupNode(group);

        group.rect.x = (e.clientX - 75) / window.innerWidth;
        group.rect.y = (e.clientY - 75) / window.innerHeight;
        group.rect.w = 150 / window.innerWidth;
        group.rect.h = 150 / window.innerHeight;

        var groupElement = groupNodes[group.id].group;

        e.target.appendChild(groupElement);

        resizeGroups();

        putTabInGroup(group.id);

        groupElement.scrollIntoView({behavior: "smooth"});

        return false;
}

export async function groupDrop(e) {
	e.stopPropagation();

	var groupId = Number(this.getAttribute('groupId'));

        putTabInGroup(groupId);

	return false;
}

export function tabDragEnd(e) {
	dragCount = 0;
	this.classList.remove('drag');
	dragIndicator.classList.remove('show');
}
