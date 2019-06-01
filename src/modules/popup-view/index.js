import { new_element, getPluralForm } from '../../js/_share/utils.js';
import { View } from '../models/View.js';

new class PopupView extends View {
  constructor() {
    super();
    return (async () => {
      await this.initializeView();
      this.content = document.getElementById('content');
      this.view = null;
      
      await this.render();

      /*
       * TODO:
       * - style search
       * - pinned groups into separate last group?
       * - add new group button
       * - edit groupname
       * - better transitions between view parts
       * - more tooltips for interactive elements
       * - better scrolling behaviour with a lot of tabs
       * - drag&drop of items?
       * - update current active group when removing a tab
       * - optimize focus styles
       * - add keyboard navigation with arrows
       */
      console.log('Panorama Tab View Popup initialied', this);

      return this;
    })();
  }

  async render() {
    this.setTheme(this.options.theme);
    this.renderGroupsView();
    this.renderSearchView();
    this.renderToolbar();
  }

  /**
   * Creates the following markup and apply it to the content
   *
   * <ul class="list">
   *   <li class="list__item">
   *     <a class="list__link" href="#">GroupName</a> 
   *     <a class="list__link-extended" href="#">20 tabs</a> 
   *   </li>
   *   <li class="list__item">...</li>
   * </ul>
   * 
   * TODO: Aync all the things
   */
  async renderGroupsView() {
    this.clearContent();
    const groups = await this.getGroups();

    // Set
    const groupNodes = await Promise.all(groups.map(async (group) => {
      await group.loadTabs();

      const groupNode = new_element('a', {
        class: 'list__link',
        href: '#',
        content: group.name,
      });
      await this.attachGroupNodeEvents(groupNode, group.tabs);

      const tabCount = group.tabs.length || 0;
      const groupExtendNode = new_element('a', {
        class: 'list__link-extend',
        href: '#',
        content: getPluralForm(tabCount, browser.i18n.getMessage('tabCount', [tabCount])),
      });
      this.attachGroupExtendNodeEvents(groupExtendNode, group);

      return new_element('li', {
        class: `list__item ${
          this.lastActiveTab.groupId === group.id ? 'list__item--selected' : ''
        }`,
      }, [
        groupNode,
        groupExtendNode,
      ]);
    }));

    const groupList = new_element('ul', {
      class: 'list',
    }, groupNodes);

    this.content.appendChild(groupList);
    this.view = 'groups';
  }

  /**
   * Creates the following markup and apply it to content
   *
   * <h2 class="group-name">GroupName</h2>
   * <ul class="list">
   *   <li class="back list__item">
   *     <a class="list__link" href="#">Go back to groups</a>
   *   </li>
   *   <li class="list__item">
   *     <a class="list__link" href="#">
   *       <img class="tab__icon" src="path/img" width="16" height="16" alt="" />
   *       TabTitle
   *     </a>
   *     <a class="tab__close" href="#" title="Close Tab"></a>
   *   </li>
   *   <li class="list__item">...</li>
   *   <li class="tab-add list__item">
   *     <a class="list__link" href="#">Open new tab</a>
   *   </li>
   * </ul>
   *
   * @param {Group} group
   */
  async renderTabsView(group) {
    this.clearContent();

    const groupNameNode = new_element('h2', {
      class: 'group-name',
      content: group.name,
    });

    const goBackToGroupsNode = new_element('li', {
      class: 'back list__item',
    }, [
      new_element('a', {
        class: 'list__link',
        href: '#',
        content: browser.i18n.getMessage('goBackToGroups'),
      }),
    ]);

    const tabNodes = this.createTabNodes(group.tabs);

    const openNewTabNode = new_element('li', {
      class: 'tab-add list__item',
    }, [
      new_element('a', {
        class: 'list__link',
        href: '#',
        content: browser.i18n.getMessage('openNewTab'),
      }),
    ]);

    const tabList = new_element('ul', {
      class: 'list',
    }, [goBackToGroupsNode, ...tabNodes, openNewTabNode]);

    // Set
    this.content.appendChild(groupNameNode);
    this.content.appendChild(tabList);
    
    // Attach
    goBackToGroupsNode.addEventListener('click', (event) => {
      event.preventDefault();
      this.renderGroupsView();
    });
    openNewTabNode.addEventListener('click', async (event) => {
      event.preventDefault();
      await group.addNewTab();
      this.closePopupView();
    });
    this.view = 'tabs';
  }

  async renderSearchView() {
    const searchInput = document.querySelector('header [type="search"]');
    const tabs = await this.getAllTabs();

    searchInput.placeholder = browser.i18n.getMessage('searchForTab.placeholder');

    searchInput.addEventListener('keyup', (event) => {
      const searchQuery = searchInput.value;

      if (searchQuery.length >= 2) {
        this.clearContent();

        const resultTabs = tabs.filter((tab) => {
          return new RegExp(searchQuery, 'gi').test(tab.title) || new RegExp(searchQuery, 'gi').test(tab.url);
        });
        let tabNodes = [
          new_element('li', {
            class: 'list__item',
            content: 'No results'
          }),
        ];

        if (resultTabs.length) {
          tabNodes = this.createTabNodes(resultTabs);
        }

        const tabList = new_element('ul', {
          class: 'list',
        }, tabNodes);

        // Set
        this.content.appendChild(tabList);
        this.view = 'search';
      } else {
        if (this.view !== 'groups') {
          this.renderGroupsView();
        }
      }
    }, false);
  }

  async attachGroupNodeEvents(groupNode, tabs) {
    // Click on group
    // TODO: open last used tab in group, instead of first
    if (tabs.length >= 1) {
      groupNode.addEventListener('click', async (event) => {
        event.preventDefault();
        await browser.tabs.update(tabs[0].id, { active: true });
        this.closePopupView();
      });
    }
  }

  /**
   * @param {HTMLElement} groupExtendNode
   * @param {Group} group
   */
  attachGroupExtendNodeEvents(groupExtendNode, group) {
    groupExtendNode.addEventListener('click', () => {
      this.renderTabsView(group);
    });
  }

  createTabNodes(tabs) {
    return tabs.map((tab) => {
      // Tab Icon
      const favIcon = new_element('img', {
        class: 'tab__icon',
        src: tab.favIconUrl,
        width: '16',
        height: '16',
        alt: '',
      });

      // Tab Link
      // TODO: possible async and then sort?
      const tabNode = new_element('a', {
        class: 'list__link',
        href: '#',
      }, [
        favIcon,
        document.createTextNode(tab.title),
      ]);
      tabNode.addEventListener('click', async (event) => {
        event.preventDefault();
        await browser.tabs.update(tab.id, { active: true });
        this.closePopupView();
      });

      // Tab Close
      const tabCloseNode = new_element('a', {
        class: 'tab__close',
        href: '#',
        title: browser.i18n.getMessage('closeTab'),
      });
      tabCloseNode.addEventListener('click', async (event) => {
        event.stopPropagation();
        // Remove from Browser
        await tab.remove();
        // Remove from List
        tabNode.parentNode.remove();
      }, false);

      return new_element('li', {
        class: `list__item ${
          this.lastActiveTab.id === tab.id ? 'list__item--selected' : ''
        }`,
        title: `${tab.title}\n${tab.url}`,
      }, [
        tabNode,
        tabCloseNode,
      ]);
    });
  }

  renderToolbar() {
    const settingsButton = document.getElementById('settings');

    settingsButton.title = browser.i18n.getMessage('settingsButton');
    settingsButton.addEventListener('click', function () {
      browser.runtime.openOptionsPage();
    }, false);
  }

  clearContent() {
    this.content.innerHTML = '';
  }

  closePopupView() {
    window.close();
  }
}