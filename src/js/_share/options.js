export const defaultOptions = {
  theme: "light",
  toolbarPosition: "top",
  tabGroupsStartNumber: 1,
  shortcut: {
    "toggle-panorama-view": {
      disabled: false
    },
    "activate-next-group": {
      disabled: false
    },
    "activate-previous-group": {
      disabled: false
    }
  }
};

/**
 * Return the current state of the options
 * @return {object} options
 */
export async function loadOptions() {
  const options = await browser.storage.sync.get(defaultOptions);

  return options;
}

export let currentOptions = loadOptions();
