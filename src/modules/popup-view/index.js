import { View } from '../models/View.js';
import GroupsFrame from './js/GroupsFrame.js';

/*
 * TODO:
 * - highlight active group/tab in list
 * - pinned groups into separate last group?
 * - add new group button
 * - edit groupname
 * - drag&drop of items?
 * - optimize focus styles
 * - add keyboard navigation with arrows
 * - async more things
 */

new class PopupView extends View {
  constructor() {
    super();
    return (async () => {
      await this.initializeView();
      window.View = this; // TODO: Any smarter way?
      
      this.setTheme(this.options.theme);
      GroupsFrame.render();
      console.log('Panorama Tab View Popup initialied', this);

      return this;
    })();
  }
}