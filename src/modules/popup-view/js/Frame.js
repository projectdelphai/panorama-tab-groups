import { getElementNodeFromString } from "../../models/Node.js";

export class Frame {
    constructor(id) {
        this.node = document.getElementById(id);
        this.shell = this.node.parentNode;
        this.header = this.node.querySelector('.frame-header');
        this.content = this.node.querySelector('.frame-content');
        this.footer = this.node.querySelector('.frame-footer');
        this.isAside = false;
    }

    render() {
        this.enable();
    }

    enable() {
        document.body.classList.add('content-loading');
        this.disableSibling();

        this.node.classList.add('frame--active');

        // TODO: something smarter?
        if (this.isAside) {
            this.shell.classList.add('frame-shell--aside-active');
        } else {
            this.shell.classList.remove('frame-shell--aside-active');
        }

        document.body.classList.remove('content-loading');
    }

    disableSibling() {
        const siblings = getSiblings.call(this);

        siblings.forEach((sibling) => {
            sibling.classList.remove('frame--active');
        })
    }

    setHeaderContent(content) {
        updateContent(this.header, content);
    }

    setContent(content) {
        updateContent(this.content, content);
    }

    setFooterContent(content) {
        updateContent(this.footer, content);
    }

    closePopupView() {
        window.close();
    }

    getRenderedTabList(tabs) {
        let tabNodes = tabs.map((tab) => {
            const isActive = tab.id === window.View.lastActiveTab.id;
            const node = getElementNodeFromString(`
                <li class="list__item ${isActive ? 'list__item--highlight' : ''}">
                    <a class="list__link" href="#" title="${tab.title}
${tab.url}">
                        <img class="tab__icon" src="${tab.favIconUrl}" width="16" height="16" alt="" />
                        <span>${tab.title}</span>
                    </a>
                    <a class="list__close" href="#" title="${browser.i18n.getMessage('closeTab')}"></a>
                </li>
            `);

            node.querySelector('.list__link').addEventListener('click', async (event) => {
                event.preventDefault();
                await browser.tabs.update(tab.id, { active: true });
                this.closePopupView();
            });

            node.querySelector('.list__close').addEventListener('click', async (event) => {
                event.preventDefault();
                // Remove from Browser
                await tab.remove();
                // Remove from List
                node.remove();
            });

            return node;
        });

        let tabList = getElementNodeFromString(`<ul class="list"></ul>`);
        tabList.append(...tabNodes);

        return tabList;
    }
}

/**
 * Basic functionality forked from jQuery
 */
function getSiblings() {
    let n = this.shell.firstChild;
    let siblings = [];

    for (; n; n = n.nextSibling) {
        if (n.nodeType === 1 && n !== this.node) {
            siblings.push(n);
        }
    }

    return siblings;
}

function updateContent(contentNode, content) {
    // Reset
    contentNode.innerHTML = '';

    // Set
    if (typeof content === 'string') {
        contentNode.innerHTML = content;
    } else if (Array.isArray(content)) {
        content.forEach((item) => {
            contentNode.append(item);
        });
    } else {
        contentNode.append(content);
    }
}