export class Group {
    constructor (View, group) {
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
            this.id
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
        const tabsFromGroup = tabs.filter((tab) => {
            return tab.groupId === this.id;
        });

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

        const leftGroups = groups.filter((group) => {
            return group.id !== this.id;
        });

        this.tabs.forEach((tab) => {
            browser.tabs.remove(tab.id);
        });

        browser.sessions.setWindowValue(this.View.windowId, 'groups', leftGroups);

        return leftGroups;
    }

    async rename(newName) {
        const groups = await this.getAll();

        const updatedGroups = groups.map((group) => {
            if(group.id === this.id) {
                this.name = newName;
                group.name = newName;
            }

            return group;
        });

        await browser.sessions.setWindowValue(this.View.windowId, 'groups', updatedGroups);

        return this;
    }

    // TODO: How to resolve this duplicate?
    async getAll() {
        const groups = await browser.sessions.getWindowValue(
            this.View.windowId,
            'groups'
        ) || [];

        return Promise.all(groups.map(async (group) => {
            return new Group(this.View, group);
        }));
    }
}