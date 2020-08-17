export async function saveOptionTheme() {
  await browser.storage.sync.set({
    theme: document.querySelector('input[name="theme"]:checked').value,
  });
}
