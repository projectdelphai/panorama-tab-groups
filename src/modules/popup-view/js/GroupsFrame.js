import { Frame } from "./Frame.js";
import GroupDetailFrame from "./GroupDetailFrame.js";
import { getElementNodeFromString } from "../../models/Node.js";
import { getPluralForm } from "../../../js/_share/utils.js";

class GroupsFrame extends Frame {
    constructor(id) {
        super(id);
    }

    async render() {
        const headerRendered = this.renderHeader();
        const groupListRenderd = this.renderGroupList();
        this.renderFooter();
        super.render();

        // Setup the focus
        if (this.lastViewedGroupDetail >= 0) {
            groupListRenderd.then(() => {
                this.node.querySelector(`#group-${this.lastViewedGroupDetail} .list__link--extend`).focus();
                this.lastViewedGroupDetail = -1;
            });
        } else {
            headerRendered.then(() => {
                this.node.querySelector('input, button').focus();
            });
        }
    }

    async renderHeader() {
        const searchNode = getElementNodeFromString(`
            <div class="form-field form-field--search">
                <input class="form-field__input" type="search" name="query" placeholder="${browser.i18n.getMessage('searchForTab.placeholder')}" />
            </div>
        `);
        const searchInput = searchNode.querySelector('[type="search"]');
        const tabs = await window.View.getAllTabs();

        searchInput.addEventListener('keyup', (event) => {
            const searchQuery = searchInput.value;

            if (searchQuery.length >= 2) {
                const resultTabs = tabs.filter((tab) => {
                    return new RegExp(searchQuery, 'gi').test(tab.title) ||
                           new RegExp(searchQuery, 'gi').test(tab.url);
                });

                if (resultTabs.length) {
                    // TODO: Maybe list tabs by group
                    this.setContent(this.getRenderedTabList(resultTabs));
                } else {
                    this.setContent('No results');
                    // TODO: add translation
                    // TODO: add proper markup
                }
            } else {
                // TODO: restore or show all?
            }
        }, false);

        // Open first tab from result
        searchInput.addEventListener('keypress', (event) => {
            if (event.key !== 'Enter') {
                return;
            }

            const firstTabNode = this.node.querySelector('.list__item--tab');
            if (firstTabNode) {
                firstTabNode.Tab.open();
                this.closePopupView();
            }
        });

        const settingsNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--settings" title="${browser.i18n.getMessage('settingsButton')}"></button>
        `);
        settingsNode.addEventListener('click', function () {
            browser.runtime.openOptionsPage();
        }, false);

        this.setHeaderContent([searchNode, settingsNode]);
    }

    async renderGroupList() {
        const groups = await window.View.getGroups();

        const groupNodes = await Promise.all(groups.map(this.renderGroupListItem.bind(this)));

        let groupList = getElementNodeFromString(`<ul class="list"></ul>`);
        groupList.append(...groupNodes);
        
        this.setContent(groupList);
        this.enableGroupDragAndDrop();
    }

    async renderGroupListItem(group) {
        await group.loadTabs();
        const tabCount = group.tabs.length || 0;
        const isActive = group.id === window.View.lastActiveTab.groupId;
        const node = getElementNodeFromString(`
                <li id="group-${group.id}" data-group="${group.id}" class="list__item ${isActive ? 'list__item--highlight' : ''}" data-nav-row>
                    <div class="list__drag"></div>
                    <div class="list__close-wrapper">
                        <button class="list__link">
                            <span>${group.name}</span>
                        </button>
                        <button class="list__close" title="${browser.i18n.getMessage('closeGroup')}"></button>
                    </div>
                    <button class="list__link list__link--extend">
                        <span>${getPluralForm(tabCount, browser.i18n.getMessage('tabCount', [tabCount]))}</span>
                    </button>
                </li>
            `);

        // Open group
        node.querySelector('.list__link:not(.list__link--extend)').addEventListener(
            'click',
            async () => {
                group.show();
                this.closePopupView();
            }
        );

        // Remove group
        node.querySelector('.list__close').addEventListener('click', async () => {
            // Ask for confirmation
            const confirmation = getPluralForm(tabCount, browser.i18n.getMessage("closeGroupWarning", [tabCount]));
            if (window.confirm(confirmation)) {
                // Remove from List
                node.remove();

                const leftGroups = await group.remove();
                // TODO: what todo when last group?
                if (leftGroups.length >= 1) {
                    // TODO: Maybe show last group available group instead of first
                    leftGroups[0].show();
                }

                this.addOrUpdateDropZoneHandler();
            }
        });

        // Show group details
        const showGroupNode = node.querySelector('.list__link--extend');
        showGroupNode.addEventListener('click', () => {
            GroupDetailFrame.render(group);
        });
        showGroupNode.addEventListener('keyup', (event) => {
            if (event.key !== 'ArrowRight') {
                return;
            }
            event.stopPropagation();
            GroupDetailFrame.render(group);
        });

        return node;
    }

    enableGroupDragAndDrop() {
        this.list = this.content.querySelector('.list');
        this.listItems = this.list.querySelectorAll('.list__item');

        this.listItems.forEach((listItem) => {
            listItem.setAttribute('draggable', 'true');
            listItem.addEventListener('dragstart', this.handleGroupDragStart.bind(this), false);
            listItem.addEventListener('dragend', this.handleGroupDragEnd.bind(this), false);
        });
        this.addOrUpdateDropZoneHandler();
    }

    handleGroupDragStart(event) {
        event.target.previousSibling.style.display = 'none';
        event.target.nextSibling.style.display = 'none';
        this.list.classList.add('dragging');
        event.target.classList.add('dragged');
        event.target.setAttribute('aria-grabbed', true);
        event.dataTransfer.setData('text', event.target.getAttribute('data-group'));
        event.dataTransfer.dropEffect = 'move';
    }

    handleGroupDragEnd() {
        this.list.classList.remove('dragging');
        event.target.classList.remove('dragged');
        event.target.setAttribute('aria-grabbed', false);

        this.addOrUpdateDropZoneHandler();
    }

    addOrUpdateDropZoneHandler() {
        this.list.querySelectorAll('.drop-zone').forEach((dropZone) => {
            dropZone.remove();
        });
        // Fetch fresh list (f.e. after drop)
        this.listItems = this.list.querySelectorAll('.list__item');
        const dropZone = getElementNodeFromString(`<li class="drop-zone" aria-dropeffect="move"></li>`);

        this.listItems.forEach((listItem, index) => {
            let newDropZone = dropZone.cloneNode();
            newDropZone.setAttribute('data-index', index);

            listItem.before(newDropZone);
            newDropZone.addEventListener('dragenter', this.handleGroupDragEnter.bind(this), false);
            newDropZone.addEventListener('dragleave', this.handleGroupDragLeave.bind(this), false);
            newDropZone.addEventListener('dragover', this.handleGroupDragOver, false);
            newDropZone.addEventListener('drop', this.handleGroupDrop.bind(this), false);

            if (index === this.listItems.length - 1) {
                let newDropZone = dropZone.cloneNode();
                newDropZone.setAttribute('data-index', index + 1);
                listItem.after(newDropZone);
                newDropZone.addEventListener('dragenter', this.handleGroupDragEnter.bind(this), false);
                newDropZone.addEventListener('dragleave', this.handleGroupDragLeave.bind(this), false);
                newDropZone.addEventListener('dragover', this.handleGroupDragOver, false);
                newDropZone.addEventListener('drop', this.handleGroupDrop.bind(this), false);
            }
        });
    }

    handleGroupDragEnter(event) {
        event.target.classList.add('drop-zone--entered');
    }
    
    handleGroupDragLeave(event) {
        event.target.classList.remove('drop-zone--entered');
    }
    
    handleGroupDragOver(event) {
        // Necessary to enable drop
        event.preventDefault()
    }

    async handleGroupDrop(event) {
        event.preventDefault();
        const groupId = event.dataTransfer.getData('text');
        const droppedListItem = document.querySelector(`[data-group="${groupId}"]`);
        const targetIndex = event.target.getAttribute('data-index');
        event.target.replaceWith(droppedListItem);
        const group = await window.View.getGroupById(groupId);
        group.moveToIndex(targetIndex);
    }

    renderFooter() {
        const addGroupNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--new">${browser.i18n.getMessage('newGroupButton')}</button>
        `);
        addGroupNode.addEventListener('click', async (event) => {
            event.preventDefault();
            const group = await window.View.createGroup();
            await group.addNewTab();
            // TODO: Bring focus back to Popup afterwards
            await group.loadTabs();
            GroupDetailFrame.render(group);
        });
        this.setFooterContent(addGroupNode);
    }
}

export default new GroupsFrame('main-frame');