import { Frame } from "./Frame.js";
import GroupsFrame from "./GroupsFrame.js";
import { getElementNodeFromString } from "../../_shared/js/models/Node.js";

class GroupDetailFrame extends Frame {
    constructor(id) {
        super(id);
        this.isAside = true;
    }

    async render(group) {
        this.group = group; // TODO: Do it smarter?
        GroupsFrame.lastViewedGroupDetail = this.group.id;
        this.renderHeader();
        this.renderTabList();
        this.renderFooter();
        super.render();

        if (this.group.status === 'new') {
            this.activateGroupNameEdit(this.header.querySelector('.group-name'));
        }

        // Setup the focus
        const firstTab = this.node.querySelector('.list__link');
        if (firstTab !== null) {
            firstTab.focus();
        } else {
            this.node.querySelector('button').focus();
        }
    }

    handleEvent(event) {
        if (
            event.type === 'keyup' && 
            event.key === 'ArrowLeft' && 
            this.navigateHorizontalIndex === 0
        ) {
            GroupsFrame.render();
            return;
        }
        super.handleEvent(event);
    }

    renderHeader() {
        const backNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--back"></button>
        `);
        backNode.addEventListener('click', () => {
            GroupsFrame.render();
        });


        const groupNameNode = this.getRenderedGroupName();

        this.setHeaderContent([backNode, groupNameNode]);
    }

    getRenderedGroupName() {
        // TODO: Add translation
        const groupNameNode = getElementNodeFromString(`
            <h2 class="group-name">
                ${this.group.name}
                <button class="group-edit" title="Edit group"></button>
            </h2>
        `);

        groupNameNode.querySelector('.group-edit').addEventListener('click', (event) => {
            event.stopPropagation();
            this.activateGroupNameEdit(groupNameNode);
        });

        return groupNameNode;
    }

    activateGroupNameEdit(groupNameNode) {
        const node = getElementNodeFromString(`
                <div class="form-field group-edit-input">
                    <input class="form-field__input" type="search" value="${this.group.name}" />
                </div>
            `);
        const inputNode = node.querySelector('input');
        inputNode.addEventListener('keypress', async (event) => {
            event.stopPropagation();

            if (event.key === 'Enter') {
                const newGroupName = inputNode.value;
                this.group = await this.group.rename(newGroupName);
                const newGroupNameNode = this.getRenderedGroupName();
                node.parentNode.replaceChild(newGroupNameNode, node);
                newGroupNameNode.querySelector('.group-edit').focus();
            }
        });
        inputNode.addEventListener('keyup', async (event) => {
            // Allow arrow navigation inside the input
            event.stopPropagation();
        });
        inputNode.addEventListener('keydown', async (event) => {
            event.stopPropagation();
            // TODO: Prevent popup from closing
            // Seems to currently impossible:
            // https://discourse.mozilla.org/t/prevent-toolbar-popup-from-closing-when-pressing-esc/47464
            if (event.key === 'Esc') {
                event.preventDefault();
                const newGroupNameNode = this.getRenderedGroupName();
                node.parentNode.replaceChild(newGroupNameNode, node);
                newGroupNameNode.querySelector('.group-edit').focus();
            }
        });
        groupNameNode.parentNode.replaceChild(node, groupNameNode);
        inputNode.focus();
        inputNode.select();
    }

    renderTabList() {
        const tabList = this.getRenderedTabList(this.group.tabs);
        this.setContent(tabList);
    }

    renderFooter() {
        const addTabNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--new">${browser.i18n.getMessage('openNewTab')}</button>
        `);
        addTabNode.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.group.addNewTab();
            this.closePopupView();
        });
        this.setFooterContent(addTabNode);
    }    
}

export default new GroupDetailFrame('aside-frame');