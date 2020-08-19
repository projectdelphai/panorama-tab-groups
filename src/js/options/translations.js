export default function addTranslations() {
  document.querySelector(
    '#optionKeyboardShortcuts h2',
  ).textContent = browser.i18n.getMessage('optionKeyboardShortcuts');
  const optionKeyboardShortcutsLink = document.querySelector(
    '#optionKeyboardShortcuts a',
  );
  optionKeyboardShortcutsLink.href = browser.i18n.getMessage(
    'optionKeyboardShortcutsHelpLink',
  );
  optionKeyboardShortcutsLink.textContent = browser.i18n.getMessage(
    'optionKeyboardShortcutsHelpLinkText',
  );
  const optionKeyboardShortcutsButtonsUpdate = document.querySelectorAll(
    '#optionKeyboardShortcuts .updateShortcut',
  );
  optionKeyboardShortcutsButtonsUpdate.forEach((button) => {
    button.textContent = browser.i18n.getMessage(
      'optionKeyboardShortcutsButtonsUpdate',
    );
  });
  const optionKeyboardShortcutsButtonsReset = document.querySelectorAll(
    '#optionKeyboardShortcuts .resetShortcut',
  );
  optionKeyboardShortcutsButtonsReset.forEach((button) => {
    button.textContent = browser.i18n.getMessage(
      'optionKeyboardShortcutsButtonsReset',
    );
  });
  optionKeyboardShortcutsButtonsUpdate.forEach((button) => {
    button.textContent = browser.i18n.getMessage(
      'optionKeyboardShortcutsButtonsUpdate',
    );
  });
  const optionKeyboardShortcutsButtonsDisable = document.querySelectorAll(
    '#optionKeyboardShortcuts .disableShortcut',
  );
  optionKeyboardShortcutsButtonsDisable.forEach((button) => {
    button.textContent = browser.i18n.getMessage(
      'optionKeyboardShortcutsButtonsDisable',
    );
  });
  const optionKeyboardShortcutsButtonsEnable = document.querySelectorAll(
    '#optionKeyboardShortcuts .enableShortcut',
  );
  optionKeyboardShortcutsButtonsEnable.forEach((button) => {
    button.textContent = browser.i18n.getMessage(
      'optionKeyboardShortcutsButtonsEnable',
    );
  });
  document.querySelector(
    'label[for="_execute_browser_action"]',
  ).textContent = browser.i18n.getMessage('optionKeyboardShortcutsToggle');
  document.querySelector(
    'label[for="activate-next-group"]',
  ).textContent = browser.i18n.getMessage('optionKeyboardShortcutsNextGroup');
  document.querySelector(
    'label[for="activate-previous-group"]',
  ).textContent = browser.i18n.getMessage('optionKeyboardShortcutsPreviousGroup');
  document.querySelector(
    '#optionsView h2',
  ).textContent = browser.i18n.getMessage('optionsView');
  document.querySelector(
    'label[for="viewFreeform"] span',
  ).textContent = browser.i18n.getMessage('optionsViewFreeform');
  document.querySelector(
    'label[for="viewPopup"] span',
  ).textContent = browser.i18n.getMessage('optionsViewPopup');
  document.querySelector(
    '#optionsTheme h2',
  ).textContent = browser.i18n.getMessage('optionsTheme');
  document.querySelector(
    'label[for="themeLight"] span',
  ).textContent = browser.i18n.getMessage('optionsThemeLight');
  document.querySelector(
    'label[for="themeDark"] span',
  ).textContent = browser.i18n.getMessage('optionsThemeDark');
  document.querySelector(
    '#optionsToolbar h3',
  ).textContent = browser.i18n.getMessage('optionsToolbar');
  document.querySelector(
    '#optionsToolbar h4',
  ).textContent = browser.i18n.getMessage('optionsToolbarPosition');
  document.querySelector(
    'label[for="toolbarPositionTop"] span',
  ).textContent = browser.i18n.getMessage('optionsToolbarPositionTop');
  document.querySelector(
    'label[for="toolbarPositionRight"] span',
  ).textContent = browser.i18n.getMessage('optionsToolbarPositionRight');
  document.querySelector(
    'label[for="toolbarPositionBottom"] span',
  ).textContent = browser.i18n.getMessage('optionsToolbarPositionBottom');
  document.querySelector(
    'label[for="toolbarPositionLeft"] span',
  ).textContent = browser.i18n.getMessage('optionsToolbarPositionLeft');
  document.querySelector(
    '#optionsBackup h2',
  ).textContent = browser.i18n.getMessage('optionsBackup');
  document.querySelector(
    '#optionsBackup h3:nth-of-type(1)',
  ).textContent = browser.i18n.getMessage('optionsBackupImport');
  document.querySelector(
    '#optionsBackup p:nth-of-type(1)',
  ).textContent = browser.i18n.getMessage('optionsBackupImportText');
  document.querySelector(
    '#optionsBackup h3:nth-of-type(2)',
  ).textContent = browser.i18n.getMessage('optionsBackupExport');
  document.querySelector(
    '#optionsBackup p:nth-of-type(2)',
  ).textContent = browser.i18n.getMessage('optionsBackupExportText');
  document.querySelector(
    '#optionsStatistics h2',
  ).textContent = browser.i18n.getMessage('optionsStatistics');
  document.querySelector(
    'label[for="numberOfTabs"]',
  ).textContent = browser.i18n.getMessage('optionsStatisticsNumberOfTabs');
  document.querySelector(
    'label[for="thumbnailCacheSize"]',
  ).textContent = browser.i18n.getMessage('optionsStatisticsThumbnailCacheSize');
  document.querySelector(
    '#saveBackupButton',
  ).textContent = browser.i18n.getMessage('optionsBackupExportButton');
}
