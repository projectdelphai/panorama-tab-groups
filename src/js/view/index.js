import { getGroupId } from './tabs.js';
import { tabMoved, groupDragOver, outsideDrop, createDragIndicator } from './drag.js';
import { groupNodes, initGroupNodes, closeGroup, makeGroupNode, fillGroupNodes, insertTab, resizeGroups, updateGroupFit } from './groupNodes.js';
import { initTabNodes, makeTabNode, updateTabNode, setActiveTabNode, setActiveTabNodeById, getActiveTabId, deleteTabNode, updateThumbnail, updateFavicon } from './tabNodes.js';
import * as groups from './groups.js';

var view = {
    windowId: -1,
    tabId: -1,
    groupsNode: null,
    dragIndicator: null,
    //intervalId: null,
    tabs: {},
};

// Load settings
browser.storage.sync.get({
    useDarkTheme: false,
    theme: 'light',
    toolbarPosition: 'top',
}).then((options) => {
    /*
     * Migrate legacy theme setting
     * @deprecate should be removed in v1.0.0
     */
    if (options.useDarkTheme) {
      options.theme = 'dark';
      browser.storage.sync.set({
        useDarkTheme: null,
        theme: 'dark',
      });
    }
    setTheme(options.theme);
    setToolbarPosition(options.toolbarPosition);

    initView();
});

function setTheme(theme) {
    document.getElementsByTagName("body")[0].classList.add(`theme-${theme}`);
}

function setToolbarPosition(position) {
    document.getElementsByTagName("body")[0].classList.add(`toolbar-${position}`);
}

async function captureThumbnail(tabId) {

    var data = await browser.tabs.captureTab(tabId, {format: 'jpeg', quality: 25});
    var img = new Image;

    img.onload = async function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = 500;
        canvas.height = canvas.width * (this.height / this.width);

        //ctx.imageSmoothingEnabled = true;
        //ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

        var thumbnail = canvas.toDataURL('image/jpeg', 0.7);

        updateThumbnail(tabId, thumbnail);
        browser.sessions.setTabValue(tabId, 'thumbnail', thumbnail);
    };

    img.src = data;
}

async function captureThumbnails() {
    const tabs = browser.tabs.query({currentWindow: true, discarded: false});

    for(const tab of await tabs) {
        await captureThumbnail(tab.id); //await to lessen strain on browser
    }
}

async function doubleClick(e) {
    if (e.target.className === "content transition") {
        var groupID = e.target.getAttribute("groupid");
        var group = groups.get(groupID);
        closeGroup(e.target, group);
    }
    else if (e.target.id === "groups")
    {
        createGroup(e.clientX, e.clientY);
    }
}

/**
 * Initialize the Panorama View tab
 *
 * This displays all the groups and the tabs in them, and sets up listeners
 * to respond to user actions and react to changes
 */
async function initView() {
    // set locale specific titles
    document.getElementById('newGroup').title = browser.i18n.getMessage("newGroupButton");
    document.getElementById('settings').title = browser.i18n.getMessage("settingsButton");

    view.windowId = (await browser.windows.getCurrent()).id;
    view.tabId = (await browser.tabs.getCurrent()).id;
    view.groupsNode = document.getElementById('groups');

    view.groupsNode.appendChild(createDragIndicator());

    await groups.init();

    // init Nodes
    await initTabNodes(view.tabId);
    await initGroupNodes(view.groupsNode);

    resizeGroups();

    captureThumbnails();
    //view.intervalId = setInterval(captureThumbnails, 2000);

    // set all listeners

    // Listen for clicks on new group button
    document.getElementById('newGroup').addEventListener('click', e => createGroup(), false);

    // Listen for clicks on settings button
    document.getElementById('settings').addEventListener('click', function() {
        browser.runtime.openOptionsPage();
    }, false);

    // Listen for middle clicks in background to open new group
    document.getElementById('groups').addEventListener('auxclick', async function(event) {
        event.preventDefault();
        event.stopPropagation();

        if ( event.target != document.getElementById('groups') ) return; // ignore middle clicks in foreground
        if ( event.button != 1 ) return; // middle mouse

        createGroup(e.clientX, e.clientY);
    }, false);

    document.addEventListener('visibilitychange', function() {
        if(document.hidden) {
            browser.tabs.onUpdated.removeListener(captureThumbnail);
            //clearInterval(view.intervalId);
        }else{
            browser.tabs.onUpdated.addListener(captureThumbnail);
            //view.intervalId = setInterval(captureThumbnails, 2000);
            captureThumbnails();
            window.location.reload();
        }
    }, false);

    window.addEventListener("resize", resizeGroups);
    document.addEventListener("keypress", keyInput);

    // Listen for tabs being added/removed/switched/etc. and update appropriately
    browser.tabs.onCreated.addListener(tabCreated);
    browser.tabs.onRemoved.addListener(tabRemoved);
    browser.tabs.onUpdated.addListener(tabUpdated);
    browser.tabs.onMoved.addListener(tabMoved);
    browser.tabs.onAttached.addListener(tabAttached);
    browser.tabs.onDetached.addListener(tabDetached);
    browser.tabs.onActivated.addListener(tabActivated);

    view.groupsNode.addEventListener('dragover', groupDragOver, false);
    view.groupsNode.addEventListener('drop', outsideDrop, false);
    view.groupsNode.addEventListener('dblclick', doubleClick, false);
}

async function keyInput(e) {
    if (e.key === "ArrowRight") {
        var activeTabId = getActiveTabId();
        var groupId = await getGroupId(activeTabId);
        var childNodes = groupNodes[groupId].content.childNodes;

        for (var i = 0; i < childNodes.length; i++) {
            var tabId = Number(childNodes[i].getAttribute('tabId'));
            if (tabId == activeTabId) {
                break;
            }
        }


        var newTabId = -1;
        var max = childNodes.length - 2;
        // check if at end or if tab not found
        if (i == max || i == childNodes.length) {
            var newGroupId = -1;
            var groupsLength = Object.keys(groupNodes).length;

            var last = Object.keys(groupNodes)[groupsLength - 2];
            if (groupId == last) {
                var first = Object.keys(groupNodes)[0];
                groupId = first;
            } else {
                var index = Object.keys(groupNodes).indexOf(groupId.toString());
                groupId = Object.keys(groupNodes)[index+1];
            }
            childNodes = groupNodes[groupId].content.childNodes;
            newTabId = Number(childNodes[0].getAttribute('tabId'));
        } else {
            newTabId = Number(childNodes[i+1].getAttribute('tabId'));
        }

        setActiveTabNodeById(newTabId);
    } else if (e.key === "ArrowLeft") {
        var activeTabId = getActiveTabId();
        var groupId = await getGroupId(activeTabId);
        var childNodes = groupNodes[groupId].content.childNodes;

        for (var i = 0; i < childNodes.length; i++) {
            var tabId = Number(childNodes[i].getAttribute('tabId'));
            if (tabId == activeTabId) {
                break;
            }
        }


        var newTabId = -1;
        var max = childNodes.length - 2;
        // check if at end or if tab not found
        if (i == 0 || i == childNodes.length) {
            var newGroupId = -1;
            var groupsLength = Object.keys(groupNodes).length;

            // check if at last tab in group and switch to next group
            var first = Object.keys(groupNodes)[0];
            if (groupId == first) {
                groupId = Object.keys(groupNodes)[groupsLength - 2];
            } else {
                var index = Object.keys(groupNodes).indexOf(groupId.toString());
                groupId = Object.keys(groupNodes)[index - 1];
            }
            childNodes = groupNodes[groupId].content.childNodes;
            var childNodesSize = Object.keys(childNodes).length - 2;
            newTabId = Number(childNodes[childNodesSize].getAttribute('tabId'));
        } else {
            newTabId = Number(childNodes[i-1].getAttribute('tabId'));
        }

        setActiveTabNodeById(newTabId);
    } else if (e.key === "Enter") {
        browser.tabs.update(getActiveTabId(), {active: true});
    }
}

async function createGroup(x = 75, y = 75) {
    var group = await groups.create();

    group.rect.x = (x - 75) / window.innerWidth;
    group.rect.y = (y - 75) / window.innerHeight;
    group.rect.w = 150 / window.innerWidth;
    group.rect.h = 150 / window.innerHeight;

    var groupElement = makeGroupNode(group);

    view.groupsNode.appendChild(groupElement);

    resizeGroups();

    groupElement.scrollIntoView({behavior: "smooth"});
}

async function tabCreated(tab) {
    if(view.windowId == tab.windowId){
        makeTabNode(tab);
        updateTabNode(tab);
        updateFavicon(tab);

        // Wait for background script to assign this tab to a group
        var groupId = undefined;
        while(groupId === undefined) {
            groupId = await getGroupId(tab.id);
        }

        var group = groups.get(groupId);
        await insertTab(tab);
        updateGroupFit(group);
    }
}

function tabRemoved(tabId, removeInfo) {
    if(view.windowId == removeInfo.windowId && view.tabId != tabId){
        deleteTabNode(tabId);
        groups.forEach(function(group) {
            updateGroupFit(group);
        });
    }
}

async function tabUpdated( tabId, changeInfo, tab ) {
    if ( view.windowId === tab.windowId ){
        updateTabNode( tab );
        updateFavicon( tab );
    }

    if ( 'pinned' in changeInfo ) {
        fillGroupNodes();
        updateTabNode( tab );
    }
}

async function tabAttached(tabId, attachInfo) {
    if(view.windowId == attachInfo.newWindowId){
        var tab = await browser.tabs.get(tabId);
        tabCreated(tab);
    }
}

function tabDetached(tabId, detachInfo) {
    if(view.windowId == detachInfo.oldWindowId){
        console.log('delete node', tabId);
        deleteTabNode(tabId); // something really weird is happening here...
        groups.forEach(function(group) {
            updateGroupFit(group);
        });
    }
}

async function tabActivated(activeInfo) {
    if ( activeInfo.tabId === view.tabId ) {
        await tabs.forEach( async function( tab ) {
            updateThumbnail( tab.id );
        } );
    }

    setActiveTabNode(view.tabId);
}
