export async function saveOptionToolbarPosition() {
  await browser.storage.sync.set({
    toolbarPosition: document.querySelector(
      'input[name="toolbarPosition"]:checked'
    ).value
  });
}
