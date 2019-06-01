export class Group {
    constructor (View, group) {
        return (async () => {
            Object.assign(this, group);
            this.View = View;

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

    async loadTabs() {
        const tabs = await this.View.getTabs();
        const tabsFromGroup = tabs.filter((tab) => {
            return tab.groupId === this.id;
        });

        this.tabs = tabsFromGroup;
    }

    async addNewTab() {
        await this.setActive();
        await browser.tabs.create({ active: true });
    }
}