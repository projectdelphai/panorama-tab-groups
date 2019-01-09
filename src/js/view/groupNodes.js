import { getGroupId, forEachTab } from './tabs.js';
import { groupDragOver, groupDrop } from './drag.js';
import * as groups from './groups.js';
import { new_element } from './utils.js';
import { tabNodes, getTabNode } from './tabNodes.js';

export var groupNodes = {};

export async function initGroupNodes(groupsNode) {

    groups.forEach(function(group) {
        groupsNode.appendChild(makeGroupNode(group));
    });
    fillGroupNodes();

    groupNodes.pinned = {
        content: document.getElementById( 'pinnedTabs' ),
    };
}

function snapValue(a, b, dst) {
    if(a >= b - dst && a <= b + dst){
        return b;
    }else{
        return a;
    }
}

function groupTransform(group, node, top, right, bottom, left, elem) {

    document.getElementsByTagName("body")[0].setAttribute('style', 'cursor: ' + window.getComputedStyle(elem).cursor);

    var groupsRect = node.parentNode.getBoundingClientRect();

    var minw = 150 / groupsRect.width;
    var minh = 150 / groupsRect.height;

    var snap_dstx = 5 / groupsRect.width;
    var snap_dsty = 5 / groupsRect.height;

    var clamp = function(num, min, max) {
        return num <= min ? min : num >= max ? max : num;
    };

    var first = true;
    var x, y, lx, ly;

    var rect = {};

    var onmousemove = function(event) {
        event.preventDefault();
        x = event.pageX / groupsRect.width;
        y = event.pageY / groupsRect.height;

        if(first) {
            lx = x;
            ly = y;
            first = false;

            groups.transform(group.id, group.rect);
        }

        rect.x = group.rect.x;
        rect.y = group.rect.y;
        rect.w = Math.max(group.rect.w, minw);
        rect.h = Math.max(group.rect.h, minh);
        rect.i = rect.x + rect.w;
        rect.j = rect.y + rect.h;

        if(top)			{ rect.y +=  (y - ly); }
        if(right)		{ rect.i +=  (x - lx); }
        if(bottom)		{ rect.j +=  (y - ly); }
        if(left)		{ rect.x +=  (x - lx); }

        // snap (seems a bit over complicated, but it works for now)
        groups.forEach(function(_group) {

            if(_group.id != group.id) {

                if(top && bottom) {
                    rect.y = snapValue(rect.y, _group.rect.y, snap_dsty);
                    rect.y = snapValue(rect.y, _group.rect.y + _group.rect.h, snap_dsty);

                    rect.y = snapValue(rect.y + rect.h, _group.rect.y, snap_dsty) - rect.h;
                    rect.y = snapValue(rect.y + rect.h, _group.rect.y + _group.rect.h, snap_dsty) - rect.h;
                }else if(top) {
                    rect.y = snapValue(rect.y, _group.rect.y, snap_dsty);
                    rect.y = snapValue(rect.y, _group.rect.y + _group.rect.h, snap_dsty);
                }else if(bottom) {
                    rect.j = snapValue(rect.j, _group.rect.y, snap_dsty);
                    rect.j = snapValue(rect.j, _group.rect.y + _group.rect.h, snap_dsty);
                }

                if(left && right) {
                    rect.x = snapValue(rect.x, _group.rect.x, snap_dstx);
                    rect.x = snapValue(rect.x, _group.rect.x + _group.rect.w, snap_dstx);

                    rect.x = snapValue(rect.x + rect.w, _group.rect.x, snap_dstx) - rect.w;
                    rect.x = snapValue(rect.x + rect.w, _group.rect.x + _group.rect.w, snap_dstx) - rect.w;
                }else if(left) {
                    rect.x = snapValue(rect.x, _group.rect.x, snap_dstx);
                    rect.x = snapValue(rect.x, _group.rect.x + _group.rect.w, snap_dstx);
                }else if(right) {
                    rect.i = snapValue(rect.i, _group.rect.x, snap_dstx);
                    rect.i = snapValue(rect.i, _group.rect.x + _group.rect.w, snap_dstx);
                }
            }
        });
        // ----

        if(top && right && bottom && left) {
            if(rect.x < 0) {
                rect.x = 0;
                rect.i = rect.x+rect.w;
            }
            if(rect.i > 1) {
                rect.i = 1;
                rect.x = rect.i - rect.w;
            }

            if(rect.y < 0) {
                rect.y = 0;
                rect.j = rect.y+rect.h;
            }
            if(rect.j > 1) {
                rect.j = 1;
                rect.y = rect.j - rect.h;
            }
        }else{
            if(left)   { rect.x = clamp(rect.x, 0, rect.i-minw); }
            if(right)  { rect.i = clamp(rect.i, rect.x+minw, 1); }

            if(top)    { rect.y = clamp(rect.y, 0, rect.j-minh); }
            if(bottom) { rect.j = clamp(rect.j, rect.y+minh, 1); }

            rect.w = Math.max(rect.i - rect.x, minw);
            rect.h = Math.max(rect.j - rect.y, minh);
        }

        resizeGroups(group.id, rect);
    }

    document.addEventListener('mousemove', onmousemove, false);
    document.addEventListener('mouseup', function() {

        if(rect.x !== undefined) {
            groups.transform(group.id, rect);
        }
        document.getElementsByTagName("body")[0].removeAttribute('style');

        document.removeEventListener('mousemove', onmousemove);
    }, false);

}

export async function closeGroup(content, group) {

    var childNodes = content.childNodes;
    var tabCount = childNodes.length-1;

    if(tabCount > 0) {
        var tabsPlural = (tabCount == 1 ? '' : 's')
        if(window.confirm(browser.i18n.getMessage("closeGroupWarning", [tabCount, tabsPlural]))) {
            groups.remove(group.id);
            removeGroupNode(group.id);

            forEachTab(async function(tab) {
                var groupId = await getGroupId(tab.id);
                if(groupId == group.id) {
                    browser.tabs.remove(tab.id);
                }
            });
            var first = true;
            groups.forEach(function(g) {
                if(first) {
                    groups.setActive(g.id);
                }
            });
        }
    }else{
        groups.remove(group.id);
        removeGroupNode(group.id);
    }

}


export function makeGroupNode(group) {
    // edges
    var top = new_element('div', {class: 'top'});
    var right = new_element('div', {class: 'right'});
    var bottom = new_element('div', {class: 'bottom'});
    var left = new_element('div', {class: 'left'});

    // corners
    var top_right = new_element('div', {class: 'top_right'});
    var bottom_right = new_element('div', {class: 'bottom_right'});
    var bottom_left = new_element('div', {class: 'bottom_left'});
    var top_left = new_element('div', {class: 'top_left'});

    // header
    var name = new_element('span', {class: 'name', content: group.name});
    var spacer = new_element('span', {class: 'spacer'});
    var input = new_element('input', {type: 'text', value: group.name});

    var tabCount = new_element('span', {class: 'tab_count'});

    var close = new_element('div', {class: 'close', title: browser.i18n.getMessage("closeGroup")});

    var header = new_element('div', {class: 'header', title: browser.i18n.getMessage("dragGroup")}, [name, input, spacer, tabCount, close]);

    // newtab
    var newtab = new_element('div', {class: 'newtab'}, [new_element('div', {class: 'inner'})]);

    // group
    var content = new_element('div', {class: 'content transition', groupId: group.id}, [newtab]);
    content.addEventListener('dragover', groupDragOver, false);
    content.addEventListener('drop', groupDrop, false);

    var inner = new_element('div', {class: 'inner'}, [top, right, bottom, left, top_right, bottom_right, bottom_left, top_left, header, content]);
    var node = new_element('div', {class: 'group'}, [inner]);

    close.addEventListener('click', function(event) {
        event.stopPropagation();
        closeGroup(content, group);
    }, false);

    content.addEventListener('click', function(event) {
        event.stopPropagation();
    }, false);

    newtab.addEventListener('click', async function(event) {
        event.stopPropagation();
        await groups.setActive(group.id);
        await browser.tabs.create({active: true});
    }, false);

    // move
    var moveFunc = function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 1, 1, 1, 1, header);
    };
    header.addEventListener('mousedown', moveFunc, false);

    // renaming groups
    var editing = false;

    header.addEventListener('dblclick', function(event) {
        if(!editing) {
            editing = true;

            header.removeEventListener('mousedown', moveFunc, false);

            header.classList.add('edit');
            input.setSelectionRange(0, input.value.length);
            input.focus();
        }
    }, false);

    input.addEventListener('keydown', function(event) {
        if(event.keyCode == 13) {
            input.blur();
        }
    }, false);

    input.addEventListener('blur', function(event) {
        header.classList.remove('edit');
        input.setSelectionRange(0, 0);

        name.innerHTML = '';
        name.appendChild(document.createTextNode(this.value));
        groups.rename(group.id, this.value);

        header.addEventListener('mousedown', moveFunc, false);

        editing = false;
    }, false);
    // ----

    // resize
    top.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 1, 0, 0, 0, this);
    }, false);

    right.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 0, 1, 0, 0, this);
    }, false);

    bottom.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 0, 0, 1, 0, this);
    }, false);

    left.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 0, 0, 0, 1, this);
    }, false);

    top_right.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 1, 1, 0, 0, this);
    }, false);

    bottom_right.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 0, 1, 1, 0, this);
    }, false);

    bottom_left.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 0, 0, 1, 1, this);
    }, false);

    top_left.addEventListener('mousedown', function(event) {
        event.preventDefault();
        event.stopPropagation();
        groupTransform(group, node, 1, 0, 0, 1, this);
    }, false);

    groupNodes[group.id] = {
        group: node,
        content: content,
        newtab: newtab,
        tabCount: tabCount,
        name: name,
        input: input
    };
    return node;
}

function removeGroupNode(groupId) {
    groupNodes[groupId].group.parentNode.removeChild(groupNodes[groupId].group);
    delete groupNodes[groupId];
}

export async function fillGroupNodes() {
    var fragment = {
        pinned: document.createDocumentFragment(),
    };

    groups.forEach(function(group) {
        fragment[group.id] = document.createDocumentFragment();
    });

    await forEachTab( async function( tab ) {
        if ( ! tab.pinned ) {
            const groupId = await getGroupId( tab.id );
            if ( groupId != -1 && fragment[ groupId ] ) {
                fragment[ groupId ].appendChild( getTabNode(tab.id) );
            }
        } else {
            fragment.pinned.appendChild( getTabNode(tab.id) );
        }
    });

    groups.forEach(function(group) {
        groupNodes[group.id].content.insertBefore(fragment[group.id], groupNodes[group.id].newtab);
        updateGroupFit(group);
    });

    groupNodes.pinned.content.appendChild( fragment.pinned );
}

// there is a bug in here! moving a tab to the right in the tab bar does nothing..
export async function insertTab(tab) {

    var groupId = await getGroupId(tab.id);

    if(groupId != -1) {

        var index = 0;

        var childNodes = groupNodes[groupId].content.childNodes;

        for(var i = 0; i < childNodes.length-1; i++) {

            var _tabId = Number(childNodes[i].getAttribute('tabId'));
            var _tab = await browser.tabs.get(_tabId);

            if(_tab.index >= tab.index) {
                break;
            }
            index++;
        }

        var tabNode = tabNodes[tab.id];

        if(index < childNodes.length-1) {
            childNodes[index].insertAdjacentElement('beforebegin', tabNode.tab);
        }else{
            groupNodes[groupId].newtab.insertAdjacentElement('beforebegin', tabNode.tab);
        }
    }
}

export function resizeGroups(groupId, groupRect) {

    var rect = {};

    groups.forEach(function(group) {
        var node = groupNodes[group.id].group;
        var groupsRect = node.parentNode.getBoundingClientRect();

        var minw = 150 / groupsRect.width;
        var minh = 150 / groupsRect.height;

        if(groupId !== undefined && groupId === group.id) {
            rect.x = groupRect.x;
            rect.y = groupRect.y;
            rect.w = groupRect.w;
            rect.h = groupRect.h;
        }else{
            rect.x = group.rect.x;
            rect.y = group.rect.y;
            rect.w = group.rect.w;
            rect.h = group.rect.h;
        }

        // do magic

        rect.w = Math.max(rect.w, minw);
        rect.h = Math.max(rect.h, minh);

        // automatic move out of the way stuff

        // ----

        node.style.top		= (rect.y * groupsRect.height) + 'px';
        node.style.right	= groupsRect.width - ((rect.x + rect.w) * groupsRect.width)  + 'px';
        node.style.bottom	= groupsRect.height - ((rect.y + rect.h) * groupsRect.height) + 'px';
        node.style.left		= (rect.x * groupsRect.width)  + 'px';

        var zIndex = group.id;
        if (group.lastMoved) {
            zIndex = group.lastMoved.toString().substr(-9);
        }
        node.style.zIndex	= zIndex;

        updateGroupFit(group);
    });
}

function getFit(param) {

    var a, b, ta, tb;
    var pitch = 0, w = 0;

    var area = 0;

    for(var i = 1; i <= 40; i++) {
        a = Math.min(param.width / i, param.maxWidth);
        b = a * param.ratio;

        if(a < param.minWidth) { break; } // a bit janky

        ta = Math.floor((param.width+1) / a);
        tb = Math.floor(param.height / b);

        if(ta*tb >= param.amount) {
            pitch = ta;
            w = a;
            area = a*b;
            break;
        }
    }

    // make groups with very few tabs prettier
    b = Math.min(param.height / 1, param.maxWidth*param.ratio);
    a = b / param.ratio;

    ta = Math.floor(param.width / a);
    tb = Math.floor(param.height / b);

    if(ta*tb >= param.amount && (a*b > area)) {
        pitch = ta;
        w = a;
    }
    // ----

    return {pitch: pitch, width: w, ratio: param.ratio};
}

export function updateGroupFit(group) {

    var node = groupNodes[group.id];
    var childNodes = node.content.childNodes;

    node.tabCount.innerHTML = '';
    node.tabCount.appendChild(document.createTextNode(childNodes.length-1));

    // fit
    var rect = node.content.getBoundingClientRect();

    var ratio = 0.68;
    var small = false;
    var deck = false;

    var fit = getFit({
        width: rect.width,
        height: rect.height,

        minWidth: 90,
        maxWidth: 250,

        ratio: ratio,

        amount: childNodes.length,
    });

    if(fit.pitch == 0){
        fit = getFit({
            width: rect.width,
            height: rect.height,

            minWidth: 35,
            maxWidth: 89,

            ratio: 1,

            amount: childNodes.length,
        });
    }

    // this is for the card deck view
    if(fit.pitch == 0){
        deck = true;
        fit = getFit({
            width: rect.width,
            height: rect.height,

            minWidth: 45,
            maxWidth: 250,

            ratio: ratio,

            amount: 1,
        });
    }

    var index = 0;

    var w = fit.width;
    var h = w * fit.ratio;

    if(w < 55) {
        small = true;
    }

    if(!deck){
        node.newtab.style.display = 'block';
    }else{
        node.newtab.style.display = 'none';
    }

    for(var i = 0; i < childNodes.length; i++) {
        if(small) {
            childNodes[i].classList.add('small');
        }else{
            childNodes[i].classList.remove('small');
        }

        childNodes[i].style.width = w + 'px';
        childNodes[i].style.height = h + 'px';
        childNodes[i].style.left = (w * (index % Math.floor(fit.pitch))) + 'px';
        childNodes[i].style.top = (h * Math.floor(index / Math.floor(fit.pitch))) + 'px';

        if(deck){
            childNodes[i].style.left = 0 + 'px';
            childNodes[i].style.top = 0 + 'px';
        }

        childNodes[i].style.zIndex = index;

        index++;
    }
}
