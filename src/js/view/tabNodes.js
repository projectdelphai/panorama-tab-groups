import { forEachTab, forEachTabSync } from './tabs.js';
import {
  tabDragStart, tabDragEnter, tabDragOver, tabDragLeave, tabDrop, tabDragEnd,
} from './drag.js';
import { new_element } from '../_share/utils.js';

export var tabNodes = {};
let activeTabId = -1; // tabid of active tab in view

export function getTabNode(tabId) {
  return tabNodes[tabId].tab;
}

export async function initTabNodes(tabId) {
  await forEachTab(async (tab) => {
    makeTabNode(tab);
    updateTabNode(tab);
    await updateFavicon(tab);
    await updateThumbnail(tab.id);
  });
  setActiveTabNode(tabId);
}

export function makeTabNode(tab) {
  const thumbnail = new_element('div', { class: 'thumbnail' });
  const favicon = new_element('div', { class: 'favicon' });
  const close = new_element('div', { class: 'close', title: browser.i18n.getMessage('closeTab') });
  const name = new_element('div', { class: 'name' });

  const inner = new_element('div', { class: 'inner' }, [
    thumbnail,
    favicon,
    close,
    name,
  ]);

  const node = new_element('div', { class: 'tab', draggable: 'true', tabId: tab.id }, [inner]);

  node.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    await browser.tabs.update(tab.id, { active: true });
  }, false);

  node.addEventListener('auxclick', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.button == 1) { // middle mouse
      browser.tabs.remove(tab.id);
    }
  }, false);

  close.addEventListener('click', (event) => {
    event.stopPropagation();
    browser.tabs.remove(tab.id);
  }, false);

  node.addEventListener('dragstart', tabDragStart, false);
  node.addEventListener('dragenter', tabDragEnter, false);
  node.addEventListener('dragover', tabDragOver, false);
  node.addEventListener('dragleave', tabDragLeave, false);
  node.addEventListener('drop', tabDrop, false);
  node.addEventListener('dragend', tabDragEnd, false);

  // Stop new tab from bubbling mousedown to the content tab.
  // This allows you to move just the tab to a new group
  // and still allow you to move the whole pane around (see issue 10)
  node.addEventListener('mousedown', (e) => { e.stopPropagation(); });

  tabNodes[tab.id] = {
    tab: node,
    inner,
    thumbnail,
    favicon,
    close,
    name,
  };
}

export function updateTabNode(tab) {
  const node = tabNodes[tab.id];

  if (node) {
    node.name.innerHTML = '';
    node.name.appendChild(document.createTextNode(tab.title));

    node.inner.title = tab.title;

    if (tab.discarded) {
      node.tab.classList.add('inactive');
    } else {
      node.tab.classList.remove('inactive');
    }

    if (tab.pinned) {
      node.tab.classList.add('pinned');
      node.tab.style.width = '';
      node.tab.style.height = '';
    } else {
      node.tab.classList.remove('pinned');
    }
  }
}

/**
 * Find the most recently accessed tab and give its thumbnail the selected
 * class, removing selected from all other thumbnails
 */
export async function setActiveTabNode(tabId) {
  let lastActive = -1;
  let lastAccessed = 0;

  await forEachTabSync((tab) => {
    // Can race if deleteTabNode is called at the same time (e.g. every time
    // the active tab is closed, since a new tab becomes active), so confirm
    // the tab is still in tabNodes
    if (tabNodes[tab.id]) {
      tabNodes[tab.id].tab.classList.remove('selected');
    }

    if (tab.lastAccessed > lastAccessed && tab.id != tabId) {
      lastAccessed = tab.lastAccessed;
      lastActive = tab.id;
    }
  });

  tabNodes[lastActive].tab.classList.add('selected');
  activeTabId = lastActive;
}

// Remove selected from all other thumbnails, add to tab with id given
export function setActiveTabNodeById(tabId) {
  for (const nodeId in tabNodes) {
    tabNodes[nodeId].tab.classList.remove('selected');
  }
  tabNodes[tabId].tab.classList.add('selected');
  activeTabId = tabId;
}

export function getActiveTabId() {
  return activeTabId;
}

export function deleteTabNode(tabId) {
  if (tabNodes[tabId] && tabNodes[tabId].tab.parentNode !== null) {
    tabNodes[tabId].tab.parentNode.removeChild(tabNodes[tabId].tab);
    delete tabNodes[tabId];
  }
}

export async function updateThumbnail(tabId, thumbnail) {
  const node = tabNodes[tabId];

  if (node) {
    if (!thumbnail) {
      thumbnail = await browser.sessions.getTabValue(tabId, 'thumbnail');
      // If there's extra data there we just want the thumbnail
      if (thumbnail && thumbnail.thumbnail) {
        thumbnail = thumbnail.thumbnail;
      }
    }

    if (thumbnail) {
      node.thumbnail.style.backgroundImage = `url(${thumbnail})`;
    } else {
      node.thumbnail.style.backgroundImage = '';
    }
  }
}

// This testing mechanism can seemingly hit a slow path in Firefox related
// to webRequest listeners.  If we're spending a lot of time in here, it's
// probably because another extension registered one ot those listeners
// on the Panorama tab
async function testImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = img.onabort = function () {
      reject('error');
    };

    img.onload = function () {
      resolve('success');
    };

    img.src = url;
  });
}

export async function updateFavicon(tab) {
  const node = tabNodes[tab.id];

  if (node) {
    if (tab.favIconUrl
			&& tab.favIconUrl.substr(0, 22) != 'chrome://mozapps/skin/'
			&& tab.favIconUrl != tab.url) {
      try {
        await testImage(tab.favIconUrl);
        node.favicon.style.backgroundImage = `url(${tab.favIconUrl})`;
        node.favicon.classList.add('visible');
      } catch {
        node.favicon.style.backgroundImage = '';
        node.favicon.classList.remove('visible');
      }
    } else {
      node.favicon.classList.remove('visible');
    }
  }
}
