export async function saveOptionViewPopup() {
  await browser.storage.sync.set({
    viewPopup: document.querySelector('#viewPopup').checked,
  });
}
