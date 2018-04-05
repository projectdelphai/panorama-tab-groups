# Panorama View
Tab Groups with Panorama View Add-on for Firefox

https://addons.mozilla.org/en-US/firefox/addon/panorama-view/

## Features

### Done
- Create and remove groups
- Drag and drop tabs between groups
- Only show tabs of currently selected group

### Planned
- Different views of the groups
  - Automatic with thumbnails
  - Manually resizable/movable groups with thumbnails (set tab view type per group (thumbnails, list))
  - List view with vertical lists (scrollable)
- Dark theme
- Make new group and set active when you delete last group in a window
- Drag and drop tabs and groups between windows (maybe)

### Waiting for API
- Import/restore backup (basic implementation added, discarded option in tabs.create() or a proper sessionStore API is prefered)

### Impossible (for now)
- Open privileged URLs from backups

## Known bugs
- Detached tab not always removed from the Panorama View, a refresh solves it.
