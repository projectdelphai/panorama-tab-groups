
'use strict';

/**
 * Helper function to create a new element with the given attributes and children
 */
function new_element(name, attributes, children) {

    const e = document.createElement(name);

    for(const key in attributes) {
        if(key == 'content') {
            e.appendChild(document.createTextNode(attributes[key]));
        }else{
            e.setAttribute(key.replace(/_/g, '-'), attributes[key]);
        }
    }

    for(const child of children || []) {
        e.appendChild(child);
    }

    return e;
}

var view = {
    windowId: -1,
    tabId: -1,
    groupsNode: null,
    dragIndicator: null,
    //intervalId: null,
    settings: {},
    tabs: {},
};

// Load settings
browser.storage.sync.get({
    useDarkTheme: false,
}).then((settings) => {
    view.settings = settings;

    if (view.settings.useDarkTheme) {
        useDarkTheme();
    }

    initView();
});

function useDarkTheme() {
    document.getElementsByTagName("body")[0].classList.add('dark');
}

function useLightTheme() {
    document.getElementsByTagName("body")[0].classList.remove('dark');
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
        createGroup();
    }
}

/**
 * Initialize the Panorama View tab
 *
 * This displays all the groups and the tabs in them, and sets up listeners
 * to respond to user actions and react to changes
 */
async function initView() {

    view.windowId = (await browser.windows.getCurrent()).id;
    view.tabId = (await browser.tabs.getCurrent()).id;
    view.groupsNode = document.getElementById('groups');

    view.dragIndicator = new_element('div', {class: 'drag_indicator'});
    view.groupsNode.appendChild(view.dragIndicator);

    await groups.init();

    // init Nodes
    await initTabNodes();
    await initGroupNodes();

    resizeGroups();

    captureThumbnails();
    //view.intervalId = setInterval(captureThumbnails, 2000);

    // set all listeners

    // Listen for clicks on new group button
    document.getElementById('newGroup').addEventListener('click', createGroup, false);

    // Toggle between light and dark theme
    document.getElementById('toggleTheme').addEventListener('click', function() {
        // Switch
        view.settings.useDarkTheme = !view.settings.useDarkTheme;
        if (view.settings.useDarkTheme) {
            useDarkTheme();
        } else {
            useLightTheme();
        }

        // Save
        browser.storage.sync.set(view.settings);
    }, false);

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

        createGroup();
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
        var groupId = await view.tabs.getGroupId(activeTabId);
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
            
            // check if at last tab in group and switch to next group
            if (groupId == groupsLength - 2) {
                groupId = 0;
            } else {
                groupId++;
            }
            childNodes = groupNodes[groupId].content.childNodes;
            newTabId = Number(childNodes[0].getAttribute('tabId'));
        } else {
            newTabId = Number(childNodes[i+1].getAttribute('tabId'));
        }

        setActiveTabNodeById(newTabId);
    } else if (e.key === "ArrowLeft") {
        var activeTabId = getActiveTabId();
        var groupId = await view.tabs.getGroupId(activeTabId);
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
            if (groupId == 0) {
                groupId = groupsLength - 2;
            } else {
                groupId--;
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

async function createGroup() {
    var group = await groups.create();
    makeGroupNode(group);
    var groupElement = groupNodes[group.id].group

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
            groupId = await view.tabs.getGroupId(tab.id);
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

async function tabMoved(tabId, moveInfo) {
    if(view.windowId == moveInfo.windowId){
        browser.tabs.get(tabId).then(async function(tab) {
            await insertTab(tab);
            groups.forEach(async function(group) {
                updateGroupFit(group);
            });
        });
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

    setActiveTabNode();
}
