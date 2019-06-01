/**
 * Defines the default options and return the current state.
 * @return {object} options
 */
async function loadOptions() {
  const options = await browser.storage.sync.get({
		theme: 'light',
		toolbarPosition: 'top',
    shortcut: {
      'toggle-panorama-view': {
        disabled: false,
      },
      'activate-next-group': {
        disabled: false,
      },
      'activate-previous-group': {
        disabled: false,
      },
    },
	});
  
  return options;
}

export let options = loadOptions();