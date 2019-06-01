export function addTranslations() {
  document.querySelector(
    "#optionKeyboardShortcuts h2"
  ).innerHTML = browser.i18n.getMessage("optionKeyboardShortcuts");
  const optionKeyboardShortcutsLink = document.querySelector(
    "#optionKeyboardShortcuts a"
  );
  optionKeyboardShortcutsLink.href = browser.i18n.getMessage(
    "optionKeyboardShortcutsHelpLink"
  );
  optionKeyboardShortcutsLink.innerHTML = browser.i18n.getMessage(
    "optionKeyboardShortcutsHelpLinkText"
  );
  const optionKeyboardShortcutsButtonsUpdate = document.querySelectorAll(
    "#optionKeyboardShortcuts .updateShortcut"
  );
  optionKeyboardShortcutsButtonsUpdate.forEach(button => {
    button.innerHTML = browser.i18n.getMessage(
      "optionKeyboardShortcutsButtonsUpdate"
    );
  });
  const optionKeyboardShortcutsButtonsReset = document.querySelectorAll(
    "#optionKeyboardShortcuts .resetShortcut"
  );
  optionKeyboardShortcutsButtonsReset.forEach(button => {
    button.innerHTML = browser.i18n.getMessage(
      "optionKeyboardShortcutsButtonsReset"
    );
  });
  optionKeyboardShortcutsButtonsUpdate.forEach(button => {
    button.innerHTML = browser.i18n.getMessage(
      "optionKeyboardShortcutsButtonsUpdate"
    );
  });
  const optionKeyboardShortcutsButtonsDisable = document.querySelectorAll(
    "#optionKeyboardShortcuts .disableShortcut"
  );
  optionKeyboardShortcutsButtonsDisable.forEach(button => {
    button.innerHTML = browser.i18n.getMessage(
      "optionKeyboardShortcutsButtonsDisable"
    );
  });
  const optionKeyboardShortcutsButtonsEnable = document.querySelectorAll(
    "#optionKeyboardShortcuts .enableShortcut"
  );
  optionKeyboardShortcutsButtonsEnable.forEach(button => {
    button.innerHTML = browser.i18n.getMessage(
      "optionKeyboardShortcutsButtonsEnable"
    );
  });
  document.querySelector(
    'label[for="toggle-panorama-view"]'
  ).innerHTML = browser.i18n.getMessage("optionKeyboardShortcutsToggle");
  document.querySelector(
    'label[for="activate-next-group"]'
  ).innerHTML = browser.i18n.getMessage("optionKeyboardShortcutsNextGroup");
  document.querySelector(
    'label[for="activate-previous-group"]'
  ).innerHTML = browser.i18n.getMessage("optionKeyboardShortcutsPreviousGroup");
  document.querySelector(
    'label[for="viewPopup"]'
  ).innerHTML = browser.i18n.getMessage("optionsViewPopup");
  document.querySelector(
    "#optionsTheme h2"
  ).innerHTML = browser.i18n.getMessage("optionsTheme");
  document.querySelector(
    'label[for="themeLight"] span'
  ).innerHTML = browser.i18n.getMessage("optionsThemeLight");
  document.querySelector(
    'label[for="themeDark"] span'
  ).innerHTML = browser.i18n.getMessage("optionsThemeDark");
  document.querySelector(
    "#optionsToolbar h2"
  ).innerHTML = browser.i18n.getMessage("optionsToolbar");
  document.querySelector(
    "#optionsToolbar h3"
  ).innerHTML = browser.i18n.getMessage("optionsToolbarPosition");
  document.querySelector(
    'label[for="toolbarPositionTop"] span'
  ).innerHTML = browser.i18n.getMessage("optionsToolbarPositionTop");
  document.querySelector(
    'label[for="toolbarPositionRight"] span'
  ).innerHTML = browser.i18n.getMessage("optionsToolbarPositionRight");
  document.querySelector(
    'label[for="toolbarPositionBottom"] span'
  ).innerHTML = browser.i18n.getMessage("optionsToolbarPositionBottom");
  document.querySelector(
    'label[for="toolbarPositionLeft"] span'
  ).innerHTML = browser.i18n.getMessage("optionsToolbarPositionLeft");
  document.querySelector(
    "#optionsBackup h2"
  ).innerHTML = browser.i18n.getMessage("optionsBackup");
  document.querySelector(
    "#optionsBackup h3:nth-of-type(1)"
  ).innerHTML = browser.i18n.getMessage("optionsBackupImport");
  document.querySelector(
    "#optionsBackup p:nth-of-type(1)"
  ).innerHTML = browser.i18n.getMessage("optionsBackupImportText");
  document.querySelector(
    "#optionsBackup h3:nth-of-type(2)"
  ).innerHTML = browser.i18n.getMessage("optionsBackupExport");
  document.querySelector(
    "#optionsBackup p:nth-of-type(2)"
  ).innerHTML = browser.i18n.getMessage("optionsBackupExportText");
  document.querySelector(
    "#optionsStatistics h2"
  ).innerHTML = browser.i18n.getMessage("optionsStatistics");
  document.querySelector(
    'label[for="numberOfTabs"]'
  ).innerHTML = browser.i18n.getMessage("optionsStatisticsNumberOfTabs");
  document.querySelector(
    'label[for="thumbnailCacheSize"]'
  ).innerHTML = browser.i18n.getMessage("optionsStatisticsThumbnailCacheSize");
  document.querySelector(
    "#saveBackupButton"
  ).innerHTML = browser.i18n.getMessage("optionsBackupExportButton");
}
