import { getElementNodeFromString } from "../../_shared/js/utilities/node.js";

export class Frame {
    constructor(id) {
        this.node = document.getElementById(id);
        this.shell = this.node.parentNode;
        this.header = this.node.querySelector('.frame-header');
        this.content = this.node.querySelector('.frame-content');
        this.footer = this.node.querySelector('.frame-footer');
        this.isAside = false;
        this.navigateHorizontalIndex = 0;
    }

    render() {
        this.node.addEventListener('mousedown', this);
        this.node.addEventListener('keyup', this);
        this.enable();
    }

    handleEvent(event) {
        if (event.type === 'mousedown') {
            document.body.classList.remove('keyboard-navigation');
            return;
        }
        if (event.type === 'keyup') {
            document.body.classList.add('keyboard-navigation');
        } else {
            return;
        }
        if (['ArrowUp', 'ArrowDown'].indexOf(event.key) >= 0) {
            _navigateVerticalByKeyboard.call(this, event);
        }
        if (['ArrowLeft', 'ArrowRight'].indexOf(event.key) >= 0) {
            _navigateHorizontalByKeyboard.call(this, event);
        }
    }

    setContentLoadingStart() {
        document.body.classList.add("content-loading");
    }

    enable() {
        this.node.classList.add('frame--active');

        // TODO: something smarter?
        if (this.isAside) {
            this.shell.classList.add('frame-shell--aside-active');
        } else {
            this.shell.classList.remove('frame-shell--aside-active');
        }
        setTimeout(() => {
            this.shell.dispatchEvent(
              new CustomEvent("frameshell.transitionEnd")
            );
        }, 200);

        _disableSibling.call(this);
        document.body.classList.remove('content-loading');
    }

    setHeaderContent(content) {
        _updateContent(this.header, content);
    }

    setContent(content) {
        _updateContent(this.content, content);
    }

    setFooterContent(content) {
        _updateContent(this.footer, content);
    }

    getRenderedTabList(Tabs) {
        let tabNodes = Tabs.map((Tab) => {
            const isActive = Tab.id === window.PopupView.lastActiveTab.id;
            const node = getElementNodeFromString(`
                <li data-tab="${Tab.id}" class="list__item list__item--tab ${isActive ? 'list__item--highlight' : ''}" data-nav-row>
                    <button class="list__link" title="${Tab.title}
${Tab.url}">
                        <img class="tab__icon" src="${Tab.favIconUrl}" width="16" height="16" alt="" />
                        <span>${Tab.title}</span>
                    </button>
                    <button class="list__close" title="${browser.i18n.getMessage('closeTab')}"></button>
                </li>
            `);

            // Save Tab within Node
            Object.defineProperty(node, 'Tab', {
                value: Tab,
            });

            node.querySelector('.list__link').addEventListener('click', async (event) => {
                event.preventDefault();
                Tab.open();
                window.PopupView.close();
            });

            node.querySelector('.list__close').addEventListener('click', async (event) => {
                event.preventDefault();
                // Remove from Browser
                await Tab.remove();
                // Remove from List
                node.remove();
                // TODO: Move focus to the next sibling
            });

            return node;
        });

        let tabList = getElementNodeFromString(`<ul class="list"></ul>`);
        tabList.append(...tabNodes);

        return tabList;
    }
}

function _disableSibling() {
    const siblings = _getSiblings.call(this);

    siblings.forEach((sibling) => {
        sibling.classList.remove('frame--active');
    })
}

/**
 * Basic functionality forked from jQuery
 */
function _getSiblings() {
    let n = this.shell.firstChild;
    let siblings = [];

    for (; n; n = n.nextSibling) {
        if (n.nodeType === 1 && n !== this.node) {
            siblings.push(n);
        }
    }

    return siblings;
}

function _updateContent(contentNode, content) {
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

function _navigateVerticalByKeyboard(event) {
    const rows = this.node.querySelectorAll('[data-nav-row');
    const currentRow = event.target.closest('[data-nav-row');
    const currentIndex = _getCurrentIndex(currentRow, rows);
    let targetIndex = 0;


    if (event.key === 'ArrowUp') {
        targetIndex = currentIndex - 1;
    }
    if (event.key === 'ArrowDown') {
        targetIndex = currentIndex + 1;
    }

    if (targetIndex >= rows.length) {
        targetIndex = 0;
    }
    if (targetIndex < 0) {
        targetIndex = rows.length - 1;
    }

    let horizontalTargetIndex = this.navigateHorizontalIndex;
    let targetFound = false;

    while (horizontalTargetIndex >= 0 && targetFound === false) {
        const horizontalTarget = rows[targetIndex].querySelectorAll('button,input')[horizontalTargetIndex] || null;
        
        if (horizontalTarget) {
            horizontalTarget.focus();
            targetFound = true;
        }
        horizontalTargetIndex--;
    }
}

function _navigateHorizontalByKeyboard(event) {
    const currentRow = event.target.closest('[data-nav-row');
    const cols = currentRow.querySelectorAll('button,input');
    const currentIndex = _getCurrentIndex(event.target, cols);
    let targetIndex = 0;

    if (event.key === 'ArrowLeft') {
        targetIndex = currentIndex - 1;
    }
    if (event.key === 'ArrowRight') {
        targetIndex = currentIndex + 1;
    }
    
    if (targetIndex >= cols.length) {
        targetIndex = 0;
    }
    if (targetIndex < 0) {
        targetIndex = cols.length - 1;
    }
    
    this.navigateHorizontalIndex = targetIndex;
    cols[targetIndex].focus();
}

function _getCurrentIndex(element, siblings) {
    const currentIndex = Array.from(siblings).findIndex((sibling) => {
        return sibling === element;
    });

    if (currentIndex === -1) {
        throw new Error(`Can't find current index for element ${element}`);
    }

    return currentIndex;
}