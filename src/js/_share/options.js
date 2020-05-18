export const defaultOptions = (() => {
  const majorVersion = parseInt(browser.runtime.getManifest().version);
  let options = {
    toolbarPosition: "top",
    shortcut: {
      "activate-next-group": {
        disabled: false
      },
      "activate-previous-group": {
        disabled: false
      }
    }
  };

  if (majorVersion >= 1) {
    options = Object.assign(options, {
      theme: "dark",
      view: "popup",
    });
  } else {
    options = Object.assign(options, {
      theme: "light",
      view: "freeform"
    });
  }

  return options;
})();

/**
 * Return the current state of the options
 * @return {object} options
 */
export async function loadOptions() {
  const options = await browser.storage.sync.get(defaultOptions);

  return options;
}

export let currentOptions = loadOptions();
