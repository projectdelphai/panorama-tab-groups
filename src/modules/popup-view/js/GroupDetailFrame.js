import { Frame } from "./Frame.js";
import GroupsFrame from "./GroupsFrame.js";
import { getElementNodeFromString } from "../../models/Node.js";

class GroupDetailFrame extends Frame {
    constructor(id) {
        super(id);
        this.isAside = true;
    }

    async render(group) {
        this.group = group; // TODO: Do it smarter?
        this.renderHeader();
        this.renderTabList();
        this.renderFooter();
        super.render();

        if (this.group.status === 'new') {
            this.activateGroupNameEdit(this.header.querySelector('.group-name'));
        }
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
            event.preventDefault();
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
        inputNode.addEventListener('keyup', async (event) => {
            if (event.key === 'Enter') {
                const newGroupName = inputNode.value;
                this.group = await this.group.rename(newGroupName);
                const newGroupNameNode = this.getRenderedGroupName();
                node.parentNode.replaceChild(newGroupNameNode, node);
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