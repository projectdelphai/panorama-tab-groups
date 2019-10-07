import { Frame } from "./Frame.js";
import GroupDetailFrame from "./GroupDetailFrame.js";
import { getElementNodeFromString } from "../../models/Node.js";
import { getPluralForm } from "../../../js/_share/utils.js";

let frame;

class GroupsFrame extends Frame {
    constructor(id) {
        super(id);
    }

    async render() {
        this.renderHeader();
        this.renderGroupList();
        this.renderFooter();
        super.render();
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
                    // TODO: attach key ENTER event for opening first tab?
                } else {
                    this.setContent('No results');
                    // TODO: add translation
                    // TODO: add proper markup
                }
            } else {
                // TODO: restore or show all?
            }
        }, false);

        const settingsNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--settings" type="button" title="${browser.i18n.getMessage('settingsButton')}"></button>
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
    }

    async renderGroupListItem(group) {
        await group.loadTabs();
        const tabCount = group.tabs.length || 0;
        const isActive = group.id === window.View.lastActiveTab.groupId;
        const node = getElementNodeFromString(`
                <li class="list__item ${isActive ? 'list__item--highlight': ''}">
                    <div class="list__drag"></div>
                    <div class="list__close-wrapper">
                        <a class="list__link" href="#">
                            <span>${group.name}</span>
                        </a>
                        <a class="list__close" href="#" title="${browser.i18n.getMessage('closeGroup')}"></a>
                    </div>
                    <a class="list__link list__link--extend" href="#">
                        <span>${getPluralForm(tabCount, browser.i18n.getMessage('tabCount', [tabCount]))}</span>
                    </a>
                </li>
            `);

        // Open group
        node.querySelector('.list__link:not(.list__link--extend)').addEventListener(
            'click',
            async (event) => {
                event.preventDefault();
                group.show();
                this.closePopupView();
            }
        );

        // Remove group
        node.querySelector('.list__close').addEventListener('click', async (event) => {
            event.preventDefault();
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
            }
        });

        // Show group details
        node.querySelector('.list__link--extend').addEventListener('click', (event) => {
            event.preventDefault();
            GroupDetailFrame.render(group);
        });

        return node;
    }

    renderFooter() {
        const addGroupNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--new" type="button">${browser.i18n.getMessage('newGroupButton')}</button>
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

export default frame = new GroupsFrame('main-frame');