import { getElementNodeFromString } from '../../_shared/js/utilities/node.js';

function updateContent(contentNode, content) {
  // Reset
  contentNode.innerHTML = '';

  // Set
  if (typeof content === 'string') {
    contentNode.textContent = content;
  } else if (Array.isArray(content)) {
    content.forEach((item) => {
      contentNode.append(item);
    });
  } else {
    contentNode.append(content);
  }
}

/**
 * Basic functionality forked from jQuery
 */
function getSiblings() {
  let n = this.shell.firstChild;
  const siblings = [];

  for (; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n !== this.node) {
      siblings.push(n);
    }
  }

  return siblings;
}

function disableSibling() {
  const siblings = getSiblings.call(this);

  siblings.forEach((sibling) => {
    sibling.classList.remove('frame--active');
  });
}

function getCurrentIndex(element, siblings) {
  const currentIndex = Array.from(siblings).findIndex((sibling) => sibling === element);

  if (currentIndex === -1) {
    throw new Error(`Can't find current index for element ${element}`);
  }

  return currentIndex;
}

function navigateVerticalByKeyboard(event) {
  const rows = this.node.querySelectorAll('[data-nav-row');
  const currentRow = event.target.closest('[data-nav-row');
  const currentIndex = getCurrentIndex(currentRow, rows);
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
    const horizontalTarget = rows[targetIndex].querySelectorAll('button,input')[
      horizontalTargetIndex
    ] || null;

    if (horizontalTarget) {
      horizontalTarget.focus();
      targetFound = true;
    }
    horizontalTargetIndex -= 1;
  }
}

function navigateHorizontalByKeyboard(event) {
  const currentRow = event.target.closest('[data-nav-row');
  const cols = currentRow.querySelectorAll('button,input');
  const currentIndex = getCurrentIndex(event.target, cols);
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

export default class Frame {
  constructor(id) {
    this.node = document.getElementById(id);
    this.shell = this.node.parentNode;
    this.header = this.node.querySelector('.frame-header');
    this.content = this.node.querySelector('.frame-content');
    this.footer = this.node.querySelector('.frame-footer');
    this.isAside = false;
    this.frameShellEventAttachted = false;
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
      navigateVerticalByKeyboard.call(this, event);
    }
    if (['ArrowLeft', 'ArrowRight'].indexOf(event.key) >= 0) {
      navigateHorizontalByKeyboard.call(this, event);
    }
  }

  static setContentLoadingStart() {
    document.body.classList.add('content-loading');
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
      this.shell.dispatchEvent(new CustomEvent('frameShell.transitionEnd'));
    }, 200);
    setTimeout(disableSibling.bind(this), 100);

    document.body.classList.remove('content-loading');
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

  static getRenderedTabList(Tabs, options) {
    options = { hideCloseButton: false, ...options };

    const tabNodes = Tabs.map((Tab) => {
      const isActive = Tab.id === window.PopupView.lastActiveTab.id;
      const node = getElementNodeFromString(`
                <li data-tab="${Tab.id}" 
                    class="list__item list__item--tab ${
  isActive ? 'list__item--highlight' : ''
}" data-nav-row>
                    <button class="list__link">
                        <img class="tab__icon" 
                             src="${Tab.favIconUrl}" 
                             width="16" height="16" alt="" />
                        <span></span>
                    </button>
                    <button class="list__close" 
                            title="${browser.i18n.getMessage('closeTab')}"
                            ${options.hideCloseButton ? 'hidden' : ''}></button>
                </li>
            `);

      // Save Tab within Node
      Object.defineProperty(node, 'Tab', {
        value: Tab,
      });

      let linkButton = node.querySelector('.list__link');
      linkButton.setAttribute('title', `${Tab.title}\n${Tab.url}`);
      linkButton.querySelector('span').innerText = Tab.title;
      linkButton.addEventListener('click', async (event) => {
          event.preventDefault();
          Tab.open();
          window.PopupView.close();
        });

      node
        .querySelector('.list__close')
        .addEventListener('click', async (event) => {
          event.preventDefault();
          // Remove from Browser
          await Tab.remove();
          // Remove from List
          node.remove();
          // TODO: Move focus to the next sibling
        });

      return node;
    });

    const tabList = getElementNodeFromString('<ul class="list"></ul>');
    tabList.append(...tabNodes);

    return tabList;
  }
}
