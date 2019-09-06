import { currentOptions } from "../_share/options.js";
import { addTranslations } from "./translations.js";
import {
  shortcuts,
  updateShortcut,
  resetShortcut,
  disableShortcut,
  disableShortcutForm,
  enableShortcut
} from "./shortcuts.js";
import { saveOptionTheme } from "./theme.js";
import { saveOptionToolbarPosition } from "./toolbar.js";
import { saveOptionTabGroupStartNumber } from "./tabGroup.js";
import { loadBackup, saveBackup } from "./backup.js";
import { getStatistics } from "./statistics.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  let options = await currentOptions;
  restoreOptions(options, await shortcuts);
  addTranslations();
  attachEventHandler(options, await shortcuts);
  getStatistics();
}

function restoreOptions(options, shortcuts) {
  // Shortcuts
  for (const shortcut of shortcuts) {
    if (options.shortcut[shortcut.name].disabled) {
      disableShortcutForm(shortcut.name);
    }
  }

  // Theme
  document.querySelector(
    `input[name="theme"][value="${options.theme}"]`
  ).checked = true;

  // Toolbar
  document.querySelector(
    `input[name="toolbarPosition"][value="${options.toolbarPosition}"]`
  ).checked = true;

  // Tab group
  document.querySelector('#tabGroupsStartNumber').value = options.tabGroupsStartNumber;
  document.querySelector('#tabGroupsStartNumberView').value = options.tabGroupsStartNumber;
}

function attachEventHandler(options, shortcuts) {
  // Shortcuts
  for (const shortcut of shortcuts) {
    document.querySelector(`#${shortcut.name} input`).value = shortcut.shortcut;
    document
      .querySelector(`#${shortcut.name} .updateShortcut`)
      .addEventListener("click", updateShortcut);
    document
      .querySelector(`#${shortcut.name} .resetShortcut`)
      .addEventListener("click", resetShortcut);
    document
      .querySelector(`#${shortcut.name} .disableShortcut`)
      .addEventListener("click", disableShortcut.bind(this, options));
    document
      .querySelector(`#${shortcut.name} .enableShortcut`)
      .addEventListener("click", enableShortcut.bind(this, options));
  }

  // Theme
  document
    .querySelector('form[name="formTheme"]')
    .addEventListener("change", saveOptionTheme);

  // Toolbar
  document
    .querySelector('form[name="formToolbarPosition"]')
    .addEventListener("change", saveOptionToolbarPosition);

  // Tab group
  document
    .getElementById('tabGroupsStartNumber')
    .addEventListener('change', saveOptionTabGroupStartNumber);

  // Backup
  document
    .getElementById('backupFileInput')
    .addEventListener("change", loadBackup);
  document
    .getElementById('saveBackupButton')
    .addEventListener("click", saveBackup);
}
