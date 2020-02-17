export async function saveOptionTabGroupStartNumber() {
    const value = parseInt(document.querySelector('#tabGroupsStartNumber').value);
    const valueIsNotValid = value < 1 || value > 5;

    if (valueIsNotValid) {
        value = 1;
    }

    await browser.storage.sync.set({
        tabGroupsStartNumber: value,
    });
    document.querySelector('#tabGroupsStartNumberView').value = value;
}
