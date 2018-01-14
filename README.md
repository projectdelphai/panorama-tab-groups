# Panorama View
Tab Groups with Panorama View Add-on for Firefox 57+

I will upload the source code for the add-on here when it is more or less complete.  
For now this can be used for issues and discussion.

https://addons.mozilla.org/en-US/firefox/addon/panorama-view/

## Features

### Done
- Create and remove groups
- Drag and drop tabs between groups

### Being worked on
- More solid thumbnailing
- Double checking that the active group in a window is always set and valid
- Fix up renaming of groups
- Backups (Waiting for API) Import works, but creating windows and tabs correctly isn't really possible right now (can't open about: urls, etc)

### Planned
- Different views of the groups
  - Automatic with thumbnails
  - Manually resizable/movable groups with thumbnails (set tab view type per group (thumbnails, list))
  - List view with vertical lists (scrollable)
- Dark theme
- Make new group and set active when you delete last group in a window
- Drag and drop tabs and groups between windows (maybe)

### Waiting for API
- Tab and tab-strip hiding
- Import/restore backup

### Impossible
- Properly open backup urls (maybe)

## Known bugs
- Attached tab isn't added
- Detached tab not always removed
- Won't take group id of last activated tab (might not be needed)
