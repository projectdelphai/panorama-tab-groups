import { Frame } from "./Frame.js";
import GroupsFrame from "./GroupsFrame.js";
import { getElementNodeFromString } from "../../models/Node.js";

let frame;

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
    }

    renderHeader() {
        const backNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--back" type="button"></button>
        `);
        backNode.addEventListener('click', () => {
            GroupsFrame.render();
        });


        const groupNameNode = getElementNodeFromString(`
            <h2 class="group-name">${this.group.name}</h2>
        `);

        this.setHeaderContent([backNode, groupNameNode]);
    }

    renderTabList() {
        const tabList = this.getRenderedTabList(this.group.tabs);
        this.setContent(tabList);
    }

    renderFooter() {
        const addTabNode = getElementNodeFromString(`
            <button class="button-ghost button-ghost--new" type="button">${browser.i18n.getMessage('openNewTab')}</button>
        `);
        addTabNode.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.group.addNewTab();
            this.closePopupView();
        });
        this.setFooterContent(addTabNode);
    }    
}

export default frame = new GroupDetailFrame('aside-frame');