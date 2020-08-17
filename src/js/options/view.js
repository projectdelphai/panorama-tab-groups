export async function saveOptionView() {
  const currentView = document.querySelector('input[name="view"]:checked')
    .value;
  await browser.storage.sync.set({
    view: currentView,
  });

  const background = browser.extension.getBackgroundPage();
  background.refreshView();

  showViewSpecificOptions(currentView);
}

export function showViewSpecificOptions(currentView) {
  const optionsToolbar = document.querySelector('#optionsToolbar');

  // Hide all
  optionsToolbar.setAttribute('hidden', true);

  // Show specific
  switch (currentView) {
    case 'freeform':
      optionsToolbar.removeAttribute('hidden');
      break;
  }
}
