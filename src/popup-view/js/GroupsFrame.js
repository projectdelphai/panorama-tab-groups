import { Frame } from "./Frame.js";
import GroupDetailFrame from "./GroupDetailFrame.js";
import { getElementNodeFromString } from "../../_shared/js/utilities/node.js";
import { getPluralForm } from "../../js/_share/utils.js";

class GroupsFrame extends Frame {
  constructor(id) {
    super(id);
  }

  async render() {
    this.setContentLoadingStart();
    const headerRendered = _renderHeader.call(this);
    const groupListRendered = _renderGroupList.call(this);
    _renderFooter.call(this);
    super.render();

    // Setup the focus
    if (this.lastViewedGroupDetail >= 0) {
      groupListRendered.then(() => {
        this.node
          .querySelector(
            `#group-${this.lastViewedGroupDetail} .list__link--extend`
          )
          .focus();
        this.lastViewedGroupDetail = -1;
      });
    } else {
      headerRendered.then(() => {
        this.node.querySelector("input, button").focus();
      });
    }
  }
}

export default new GroupsFrame("main-frame");

async function _renderHeader() {
  const searchNode = getElementNodeFromString(`
        <div class="form-field form-field--search">
            <input class="form-field__input" type="search" name="query" 
                   placeholder="${browser.i18n.getMessage(
                     "searchForTab.placeholder"
                   )}" />
        </div>
    `);
  const searchInput = searchNode.querySelector('[type="search"]');
  const tabs = await window.PopupView.getAllTabs();

  searchInput.addEventListener(
    "keyup",
    event => {
      const searchQuery = searchInput.value;

      if (searchQuery.length >= 2) {
        const resultTabs = tabs.filter(tab => {
          return (
            new RegExp(searchQuery, "gi").test(tab.title) ||
            new RegExp(searchQuery, "gi").test(tab.url)
          );
        });

        if (resultTabs.length) {
          // TODO: Maybe list tabs by group
          const renderedTabs = this.getRenderedTabList(resultTabs);

          // Show that the first search result is selected when hitting enter
          const firstTabItem = renderedTabs.querySelector(".list__item");
          firstTabItem.classList.add("list__item--selected");
          firstTabItem
            .querySelector(".list__link")
            .addEventListener("blur", () => {
              firstTabItem.classList.remove("list__item--selected");
            });

          this.setContent(renderedTabs);
        } else {
          this.setContent("No results");
          // TODO: add translation
          // TODO: add proper markup
        }
      } else {
        // TODO: restore or show all?
      }
    },
    false
  );

  // Open first tab from result
  searchInput.addEventListener("keypress", event => {
    if (event.key !== "Enter") {
      return;
    }

    const firstTabNode = this.node.querySelector(".list__item--tab");
    if (firstTabNode) {
      firstTabNode.Tab.open();
      window.PopupView.close();
    }
  });

  const settingsNode = getElementNodeFromString(`
        <button class="button-ghost button-ghost--settings" 
                title="${browser.i18n.getMessage("settingsButton")}"></button>
    `);
  settingsNode.addEventListener(
    "click",
    function() {
      browser.runtime.openOptionsPage();
    },
    false
  );

  this.setHeaderContent([searchNode, settingsNode]);
}

async function _renderGroupList() {
  const groups = await window.PopupView.getGroups();
  const groupNodes = await Promise.all(
    groups.map(_renderGroupListItem.bind(this))
  );
  let groupList = getElementNodeFromString(`<ul class="list"></ul>`);
  groupList.append(...groupNodes);

  this.setContent(groupList);
  _enableGroupDragAndDrop.call(this);
}

async function _renderGroupListItem(Group) {
  await Group.loadTabs();
  const tabCount = Group.tabs.length || 0;
  const isActive = Group.id === window.PopupView.lastActiveTab.groupId;
  const node = getElementNodeFromString(`
        <li id="group-${Group.id}" 
            class="list__item ${
              isActive ? "list__item--highlight" : ""
            }" data-nav-row>
            <div class="list__drag"></div>
            <div class="list__close-wrapper">
                <button class="list__link">
                    <span>${Group.name}</span>
                </button>
                <button class="list__close" 
                        title="${browser.i18n.getMessage(
                          "closeGroup"
                        )}"></button>
            </div>
            <button class="list__link list__link--extend">
                <span>
                    ${getPluralForm(
                      tabCount,
                      browser.i18n.getMessage("tabCount", [tabCount])
                    )}
                </span>
            </button>
        </li>
    `);

  // Save Group within Node
  Object.defineProperty(node, "Group", {
    value: Group
  });

  // Open group
  node
    .querySelector(".list__link:not(.list__link--extend)")
    .addEventListener("click", async () => {
      Group.show();
      window.PopupView.close();
    });

  // Remove group
  node.querySelector(".list__close").addEventListener("click", async () => {
    // Ask for confirmation
    const confirmation = getPluralForm(
      tabCount,
      browser.i18n.getMessage("closeGroupWarning", [tabCount])
    );
    if (window.confirm(confirmation)) {
      // Remove from List
      node.remove();

      const leftGroups = await Group.remove();
      // TODO: what todo when last group?
      if (leftGroups.length >= 1) {
        // TODO: Maybe show last group available group instead of first
        leftGroups[0].show();
      }

      _addOrUpdateDropZoneHandler.call(this);
    }
  });

  // Show group details
  const showGroupNode = node.querySelector(".list__link--extend");
  showGroupNode.addEventListener("click", () => {
    GroupDetailFrame.render(Group);
  });
  showGroupNode.addEventListener("keyup", event => {
    if (event.key !== "ArrowRight") {
      return;
    }
    event.stopPropagation();
    GroupDetailFrame.render(Group);
  });

  return node;
}

function _enableGroupDragAndDrop() {
  this.list = this.content.querySelector(".list");
  this.listItems = this.list.querySelectorAll(".list__item");

  this.listItems.forEach(listItem => {
    listItem.setAttribute("draggable", "true");
    listItem.addEventListener(
      "dragstart",
      _handleGroupDragStart.bind(this),
      false
    );
    listItem.addEventListener("dragend", _handleGroupDragEnd.bind(this), false);
  });

  _addOrUpdateDropZoneHandler.call(this);
}

function _handleGroupDragStart(event) {
  event.target.previousSibling.style.display = "none";
  event.target.nextSibling.style.display = "none";
  this.list.classList.add("dragging");
  event.target.classList.add("dragged");
  event.target.setAttribute("aria-grabbed", true);
  event.dataTransfer.setData("text", event.target.id);
  event.dataTransfer.dropEffect = "move";
}

function _handleGroupDragEnd(event) {
  this.list.classList.remove("dragging");
  event.target.classList.remove("dragged");
  event.target.setAttribute("aria-grabbed", false);

  _addOrUpdateDropZoneHandler.call(this);
}

function _addOrUpdateDropZoneHandler() {
  this.list.querySelectorAll(".drop-zone").forEach(dropZone => {
    dropZone.remove();
  });
  // Fetch fresh list (f.e. after drop)
  this.listItems = this.list.querySelectorAll(".list__item");
  const dropZone = getElementNodeFromString(`
        <li class="drop-zone" aria-dropeffect="move"></li>
    `);

  this.listItems.forEach((listItem, index) => {
    let newDropZone = dropZone.cloneNode();
    newDropZone.setAttribute("data-index", index);

    listItem.before(newDropZone);
    newDropZone.addEventListener(
      "dragenter",
      _handleGroupDragEnter.bind(this),
      false
    );
    newDropZone.addEventListener(
      "dragleave",
      _handleGroupDragLeave.bind(this),
      false
    );
    newDropZone.addEventListener("dragover", _handleGroupDragOver, false);
    newDropZone.addEventListener("drop", _handleGroupDrop.bind(this), false);

    if (index === this.listItems.length - 1) {
      let newDropZone = dropZone.cloneNode();
      newDropZone.setAttribute("data-index", index + 1);
      listItem.after(newDropZone);
      newDropZone.addEventListener(
        "dragenter",
        _handleGroupDragEnter.bind(this),
        false
      );
      newDropZone.addEventListener(
        "dragleave",
        _handleGroupDragLeave.bind(this),
        false
      );
      newDropZone.addEventListener("dragover", _handleGroupDragOver, false);
      newDropZone.addEventListener("drop", _handleGroupDrop.bind(this), false);
    }
  });
}

function _handleGroupDragEnter(event) {
  event.target.classList.add("drop-zone--entered");
}

function _handleGroupDragLeave(event) {
  event.target.classList.remove("drop-zone--entered");
}

function _handleGroupDragOver(event) {
  // Necessary to enable drop
  event.preventDefault();
}

async function _handleGroupDrop(event) {
  event.preventDefault();
  const groupId = event.dataTransfer.getData("text");
  const droppedGroupNode = document.getElementById(groupId);
  const targetIndex = event.target.getAttribute("data-index");
  event.target.replaceWith(droppedGroupNode);
  droppedGroupNode.Group.moveToIndex(targetIndex);
}

function _renderFooter() {
  const addGroupNode = getElementNodeFromString(`
        <button class="button-ghost button-ghost--new">
            ${browser.i18n.getMessage("newGroupButton")}
        </button>
    `);
  addGroupNode.addEventListener("click", async event => {
    event.preventDefault();
    const group = await window.PopupView.createGroup();
    await group.addNewTab();
    // TODO: Bring focus back to Popup afterwards
    await group.loadTabs();
    GroupDetailFrame.render(group);
  });
  this.setFooterContent(addGroupNode);
}
