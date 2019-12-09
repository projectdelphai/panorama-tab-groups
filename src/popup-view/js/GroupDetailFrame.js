import { Frame } from "./Frame.js";
import GroupsFrame from "./GroupsFrame.js";
import { getElementNodeFromString } from "../../_shared/js/utilities/node.js";

class GroupDetailFrame extends Frame {
  constructor(id) {
    super(id);
    this.isAside = true;
  }

  async render(group) {
    this.group = group; // TODO: Do it smarter?
    this.setContentLoadingStart();
    GroupsFrame.lastViewedGroupDetail = this.group.id;
    _renderHeader.call(this);
    _renderTabList.call(this);
    _renderFooter.call(this);
    if (this.frameShellEventAttachted === false) {
      this.frameShellEventAttachted = true;
      this.shell.addEventListener("frameShell.transitionEnd", () => {
        // Set initial Focus
        const firstTab = this.node.querySelector(".list__link");
        if (firstTab !== null) {
          firstTab.focus();
        } else {
          this.node.querySelector("button").focus();
        }
      });
    }
    super.render();

    if (this.group.status === "new") {
      _activateGroupNameEdit.call(
        this,
        this.header.querySelector(".group-name")
      );
    }
  }

  handleEvent(event) {
    if (
      event.type === "keyup" &&
      event.key === "ArrowLeft" &&
      this.navigateHorizontalIndex === 0
    ) {
      GroupsFrame.render();
      return;
    }
    super.handleEvent(event);
  }
}

export default new GroupDetailFrame("aside-frame");

function _renderHeader() {
  const backNode = getElementNodeFromString(`
        <button class="button-ghost button-ghost--back"></button>
    `);
  backNode.addEventListener("click", () => {
    GroupsFrame.render();
  });

  const groupNameNode = _getRenderedGroupName.call(this);

  this.setHeaderContent([backNode, groupNameNode]);
}

function _getRenderedGroupName() {
  // TODO: Add translation
  const groupNameNode = getElementNodeFromString(`
        <h2 class="group-name">
            ${this.group.name}
            <button class="group-edit" title="Edit group"></button>
        </h2>
    `);

  groupNameNode
    .querySelector(".group-edit")
    .addEventListener("click", event => {
      event.stopPropagation();
      _activateGroupNameEdit.call(this, groupNameNode);
    });

  return groupNameNode;
}

function _activateGroupNameEdit(groupNameNode) {
  const node = getElementNodeFromString(`
        <div class="form-field group-edit-input">
            <input class="form-field__input" type="search" value="${this.group.name}" />
        </div>
    `);
  const inputNode = node.querySelector("input");
  inputNode.addEventListener("keypress", async event => {
    event.stopPropagation();

    if (event.key === "Enter") {
      const newGroupName = inputNode.value;
      this.group = await this.group.rename(newGroupName);
      const newGroupNameNode = _getRenderedGroupName.call(this);
      node.parentNode.replaceChild(newGroupNameNode, node);
      newGroupNameNode.querySelector(".group-edit").focus();
    }
  });
  // TODO: Save edited group name on input blur
  inputNode.addEventListener("keyup", async event => {
    // Allow arrow navigation inside the input
    event.stopPropagation();
  });
  inputNode.addEventListener("keydown", async event => {
    event.stopPropagation();
    // TODO: Prevent popup from closing
    // Seems to currently impossible:
    // https://discourse.mozilla.org/t/prevent-toolbar-popup-from-closing-when-pressing-esc/47464
    if (event.key === "Esc") {
      event.preventDefault();
      const newGroupNameNode = _getRenderedGroupName.call(this);
      node.parentNode.replaceChild(newGroupNameNode, node);
      newGroupNameNode.querySelector(".group-edit").focus();
    }
  });
  groupNameNode.parentNode.replaceChild(node, groupNameNode);
  inputNode.focus();
  inputNode.select();
}

function _renderTabList() {
  const tabList = this.getRenderedTabList(this.group.tabs);
  this.setContent(tabList);
}

function _renderFooter() {
  const addTabNode = getElementNodeFromString(`
        <button class="button-ghost button-ghost--new">
            ${browser.i18n.getMessage("openNewTab")}
        </button>
    `);
  addTabNode.addEventListener("click", async event => {
    event.preventDefault();
    await this.group.addNewTab();
    window.PopupView.close();
  });
  this.setFooterContent(addTabNode);
}
