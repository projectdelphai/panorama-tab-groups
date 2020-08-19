import View from '../_shared/js/models/View.js';
import GroupsFrame from './js/GroupsFrame.js';

/*
 * TODO:
 * - Polish search
 * - Pinned groups: fix active group highlight, separate last group?
 * - async more things
 */

new (class PopupView extends View {
  constructor() {
    super();
    return (async () => {
      await this.initializeView();
      window.PopupView = this; // TODO: Any smarter way?

      this.setTheme(this.options.theme);
      GroupsFrame.render();

      return this;
    })();
  }

  close() {
    window.close();
  }
})();
