export class Tab {
    constructor (tab) {
        return (async () => {
            Object.assign(this, tab);
            this.groupId = await getGroupId(this);

            return this;
        })();
    }

    async open() {
        await browser.tabs.update(this.id, { active: true });
    }

    async remove() {
        await browser.tabs.remove(this.id);
    }
}

async function getGroupId(Tab) {
    return await browser.sessions.getTabValue(Tab.id, 'groupId');
};