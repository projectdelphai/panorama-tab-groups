export class Group {
  constructor(View, group) {
    return (async () => {
      Object.assign(this, group);
      this.View = View;
      this.status = group.status || 'default';

      return this;
    })();
  }

  async setActive() {
    await browser.sessions.setWindowValue(
      this.View.windowId,
      'activeGroup',
      this.id,
    );
  }

  // TODO: open last used tab in group, instead of first
  async show() {
    if (Array.isArray(this.tabs) === false) {
      await this.loadTabs();
    }

    await browser.tabs.update(this.tabs[0].id, { active: true });
    this.setActive();
  }

  async loadTabs() {
    const tabs = await this.View.getTabs();
    const tabsFromGroup = tabs.filter((tab) => tab.groupId === this.id);

    this.tabs = tabsFromGroup;
  }

  async addNewTab() {
    await this.setActive();
    const tab = await browser.tabs.create({ active: true });
    await browser.sessions.setTabValue(tab.id, 'groupId', this.id);
  }

  /**
   * @return {array} leftGroups
   */
  async remove() {
    const groups = await this.getAll();

    if (Array.isArray(this.tabs) === false) {
      await this.loadTabs();
    }

    const leftGroups = groups.filter((group) => group.id !== this.id);

    this.tabs.forEach((tab) => {
      browser.tabs.remove(tab.id);
    });

    browser.sessions.setWindowValue(this.View.windowId, 'groups', leftGroups);

    return leftGroups;
  }

  async rename(newName) {
    const groups = await this.getAll();

    const updatedGroups = groups.map((group) => {
      if (group.id === this.id) {
        this.name = newName;
        group.name = newName;
      }

      return group;
    });

    await browser.sessions.setWindowValue(
      this.View.windowId,
      'groups',
      updatedGroups,
    );

    return this;
  }

  async moveToIndex(targetIndex) {
    const groups = await this.getAll();
    targetIndex = parseInt(targetIndex);

    // Get current index
    const currentIndex = groups.findIndex((group) => group.id === this.id);

    if (currentIndex === -1) {
      throw new Error(`Can't find current index for group ${group}`);
    }

    // Update target index if necessary
    if (targetIndex >= groups.length) {
      targetIndex = groups.length - 1;
    } else if (targetIndex > currentIndex) {
      targetIndex -= 1;
    }

    // Update position of group
    const groupData = groups.splice(currentIndex, 1);
    groups.splice(targetIndex, 0, groupData[0]);
    await browser.sessions.setWindowValue(this.View.windowId, 'groups', groups);
  }

  // TODO: How to resolve this duplicate?
  async getAll() {
    const groups = (await browser.sessions.getWindowValue(this.View.windowId, 'groups'))
      || [];

    return Promise.all(
      groups.map(async (group) => new Group(this.View, group)),
    );
  }
}
