/**
 * @fileoverview dragscroll - scroll area by dragging
 * @version 0.0.8
 *
 * @license MIT, see http://github.com/asvd/dragscroll
 * @copyright 2015 asvd <heliosframework@gmail.com>
 */

(function f(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports);
  } else {
    factory((root.dragscroll = {}));
  }
}(this, (exports) => {
  const tWindow = window;
  const tDocument = document;
  const mousemove = 'mousemove';
  const mouseup = 'mouseup';
  const mousedown = 'mousedown';
  const EventListener = 'EventListener';
  const addEventListener = `add${EventListener}`;
  const removeEventListener = `remove${EventListener}`;
  let newScrollX; let
    newScrollY;

  let dragged = [];
  const reset = function f(i, el) {
    for (i = 0; i < dragged.length;) {
      el = dragged[i++];
      el = el.container || el;
      el[removeEventListener](mousedown, el.md, 0);
      tWindow[removeEventListener](mouseup, el.mu, 0);
      tWindow[removeEventListener](mousemove, el.mm, 0);
    }

    // cloning into array since HTMLCollection is updated dynamically
    dragged = [].slice.call(tDocument.getElementsByClassName('dragscroll'));
    for (i = 0; i < dragged.length;) {
      (function f(el, lastClientX, lastClientY, pushed, scroller, cont) {
        (cont = el.container || el)[addEventListener](
          mousedown,
          cont.md = function f(e) {
            if (!el.hasAttribute('nochilddrag')
                            || tDocument.elementFromPoint(
                              e.pageX, e.pageY,
                            ) === cont
            ) {
              pushed = 1;
              lastClientX = e.clientX;
              lastClientY = e.clientY;

              e.preventDefault();
            }
          }, 0,
        );

        tWindow[addEventListener](
          mouseup, cont.mu = function f() { pushed = 0; }, 0,
        );

        tWindow[addEventListener](
          mousemove,
          cont.mm = function f(e) {
            if (pushed) {
              (scroller = el.scroller || el).scrollLeft
                                -= newScrollX = (-lastClientX + (lastClientX = e.clientX));
              scroller.scrollTop
                                -= newScrollY = (-lastClientY + (lastClientY = e.clientY));
              if (el === tDocument.body) {
                (scroller = tDocument.documentElement).scrollLeft -= newScrollX;
                scroller.scrollTop -= newScrollY;
              }
            }
          }, 0,
        );
      }(dragged[i++]));
    }
  };

  if (tDocument.readyState === 'complete') {
    reset();
  } else {
    tWindow[addEventListener]('load', reset, 0);
  }

  exports.reset = reset;
}));
