
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

function formatByteSize(bytes) {
	if(bytes < 1024) return bytes + " bytes";
	else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
	else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
	else return(bytes / 1073741824).toFixed(3) + " GiB";
};

async function getStatistics() {

	const tabs = await browser.tabs.query({});

	var totalSize = 0;
	var numActiveTabs = 0;

	for(const tab of tabs) {

		var thumbnail = await browser.sessions.getTabValue(tab.id, 'thumbnail');

		if(thumbnail) {
			if (thumbnail.thumbnail){
				totalSize += thumbnail.thumbnail.length;
			} else {
				totalSize += thumbnail.length;
			}
		}
		if(!tab.discarded) {
			numActiveTabs++;
		}
	}

	document.getElementById('thumbnailCacheSize').innerHTML = '';
	document.getElementById('thumbnailCacheSize').appendChild(document.createTextNode(formatByteSize(totalSize)));

	document.getElementById('numberOfTabs').innerHTML = '';
	document.getElementById('numberOfTabs').appendChild(document.createTextNode(
		`${tabs.length} (${browser.i18n.getMessage('optionsStatisticsNumberOfTabsActive')} ${numActiveTabs})`)
	);
}

/*function changeTheme() {
	var tabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});

	if(tabs.length > 0) {
		browser.tabs.sendMessage(tabs[0].id, JSON.stringify({name: 'updateThumbnail', value: tabId}));
	};
}*/

async function init() {
	addTranslations();
	restoreOptions();

	const commands = await browser.commands.getAll();
	for (command of commands) {
		document.querySelector(`#${command.name} input`).value = command.shortcut;
		document.querySelector(`#${command.name} .updateShortcut`).addEventListener('click', updateShortcut);
		document.querySelector(`#${command.name} .resetShortcut`).addEventListener('click', resetShortcut);
		document.querySelector(`#${command.name} .disableShortcut`).addEventListener('click', disableShortcut);
	}

	getStatistics();
	document.getElementById('backupFileInput').addEventListener('change', loadBackup);
	document.getElementById('saveBackupButton').addEventListener('click', saveBackup);
}

async function addTranslations() {
	document.querySelector('#optionKeyboardShortcuts h2').innerHTML = browser.i18n.getMessage('optionKeyboardShortcuts');
	const optionKeyboardShortcutsLink = document.querySelector('#optionKeyboardShortcuts a');
	optionKeyboardShortcutsLink.href = browser.i18n.getMessage('optionKeyboardShortcutsHelpLink');
	optionKeyboardShortcutsLink.innerHTML = browser.i18n.getMessage('optionKeyboardShortcutsHelpLinkText');
	const optionKeyboardShortcutsButtonsUpdate = document.querySelectorAll('#optionKeyboardShortcuts .updateShortcut');
	optionKeyboardShortcutsButtonsUpdate.forEach((button) => { button.innerHTML = browser.i18n.getMessage('optionKeyboardShortcutsButtonsUpdate') });
	const optionKeyboardShortcutsButtonsReset = document.querySelectorAll('#optionKeyboardShortcuts .resetShortcut');
	optionKeyboardShortcutsButtonsReset.forEach((button) => { button.innerHTML = browser.i18n.getMessage('optionKeyboardShortcutsButtonsReset') });
	document.querySelector('label[for="toggle-panorama-view"]').innerHTML = browser.i18n.getMessage('optionKeyboardShortcutsToggle');
	document.querySelector('label[for="activate-next-group"]').innerHTML = browser.i18n.getMessage('optionKeyboardShortcutsNextGroup');
	document.querySelector('label[for="activate-previous-group"]').innerHTML = browser.i18n.getMessage('optionKeyboardShortcutsPreviousGroup');
	document.querySelector('#optionsTheme h2').innerHTML = browser.i18n.getMessage('optionsTheme');
	document.querySelector('label[for="themeLight"] span').innerHTML = browser.i18n.getMessage('optionsThemeLight');
	document.querySelector('label[for="themeDark"] span').innerHTML = browser.i18n.getMessage('optionsThemeDark');
	document.querySelector('#optionsToolbar h2').innerHTML = browser.i18n.getMessage('optionsToolbar');
	document.querySelector('#optionsToolbar h3').innerHTML = browser.i18n.getMessage('optionsToolbarPosition');
	document.querySelector('label[for="toolbarPositionTop"] span').innerHTML = browser.i18n.getMessage('optionsToolbarPositionTop');
	document.querySelector('label[for="toolbarPositionRight"] span').innerHTML = browser.i18n.getMessage('optionsToolbarPositionRight');
	document.querySelector('label[for="toolbarPositionBottom"] span').innerHTML = browser.i18n.getMessage('optionsToolbarPositionBottom');
	document.querySelector('label[for="toolbarPositionLeft"] span').innerHTML = browser.i18n.getMessage('optionsToolbarPositionLeft');
	document.querySelector('#optionsBackup h2').innerHTML = browser.i18n.getMessage('optionsBackup');
	document.querySelector('#optionsBackup h3:nth-of-type(1)').innerHTML = browser.i18n.getMessage('optionsBackupImport');
	document.querySelector('#optionsBackup p:nth-of-type(1)').innerHTML = browser.i18n.getMessage('optionsBackupImportText');
	document.querySelector('#optionsBackup h3:nth-of-type(2)').innerHTML = browser.i18n.getMessage('optionsBackupExport');
	document.querySelector('#optionsBackup p:nth-of-type(2)').innerHTML = browser.i18n.getMessage('optionsBackupExportText');
	document.querySelector('#optionsStatistics h2').innerHTML = browser.i18n.getMessage('optionsStatistics');
	document.querySelector('label[for="numberOfTabs"]').innerHTML = browser.i18n.getMessage('optionsStatisticsNumberOfTabs');
	document.querySelector('label[for="thumbnailCacheSize"]').innerHTML = browser.i18n.getMessage('optionsStatisticsThumbnailCacheSize');
	document.querySelector('#saveBackupButton').innerHTML = browser.i18n.getMessage('optionsBackupExportButton')
}

async function updateShortcut() {
	const shortcut = this.parentElement.getAttribute('id');
  await browser.commands.update({
    name: shortcut,
    shortcut: document.querySelector(`#${shortcut} input`).value
  });
}

async function resetShortcut() {
	const shortcut = this.parentElement.getAttribute('id');
  await browser.commands.reset(shortcut);
	const commands = await browser.commands.getAll();
  document.querySelector(`#${shortcut} input`).value = commands[shortcut];
}

function saveOptionTheme() {
  browser.storage.sync.set({
    theme: document.querySelector('input[name="theme"]:checked').value
  });
}

function saveOptionToolbarPosition() {
  browser.storage.sync.set({
    toolbarPosition: document.querySelector('input[name="toolbarPosition"]:checked').value
  });
}

function restoreOptions() {
  browser.storage.sync.get({
		theme: 'light',
		toolbarPosition: 'top',
	}).then((options) => {
		// Theme
    document.querySelector(`input[name="theme"][value="${options.theme}"]`).checked = true;

		// Toolbar
    document.querySelector(`input[name="toolbarPosition"][value="${options.toolbarPosition}"]`).checked = true;
  });
}

document.addEventListener('DOMContentLoaded', init);
document.querySelector('form[name="formTheme"]').addEventListener('change', saveOptionTheme);
document.querySelector('form[name="formToolbarPosition"]').addEventListener('change', saveOptionToolbarPosition);
