export const shortcuts = browser.commands.getAll();

export async function updateShortcut(event) {
  event.preventDefault();
  const button = event.target;
  const shortcut = button.parentElement.getAttribute('id');

  await browser.commands.update({
    name: shortcut,
    shortcut: document.querySelector(`#${shortcut} input`).value,
  });
}

export async function resetShortcut(event) {
  event.preventDefault();
  const button = event.target;
  const shortcut = button.parentElement.getAttribute('id');

  await browser.commands.reset(shortcut);
  const commands = await browser.commands.getAll();
  for (const command of commands) {
    if (command.name === shortcut) {
      document.querySelector(`#${shortcut} input`).value = command.shortcut;
    }
  }
}

export async function disableShortcut(options, event) {
  event.preventDefault();
  const button = event.target;
  const shortcut = button.parentElement.getAttribute('id');

  options.shortcut = Object.assign(options.shortcut, {
    [shortcut]: {
      disabled: true,
    },
  });
  await browser.storage.sync.set(options);

  disableShortcutForm(shortcut);
}

export function disableShortcutForm(shortcut) {
  document.querySelector(`#${shortcut} input`).disabled = true;
  document
    .querySelector(`#${shortcut} .updateShortcut`)
    .setAttribute('hidden', true);
  document
    .querySelector(`#${shortcut} .resetShortcut`)
    .setAttribute('hidden', true);
  document
    .querySelector(`#${shortcut} .disableShortcut`)
    .setAttribute('hidden', true);
  document
    .querySelector(`#${shortcut} .enableShortcut`)
    .removeAttribute('hidden');
}

export async function enableShortcut(options, event) {
  event.preventDefault();
  const button = event.target;
  const shortcut = button.parentElement.getAttribute('id');

  options.shortcut = Object.assign(options.shortcut, {
    [shortcut]: {
      disabled: false,
    },
  });
  await browser.storage.sync.set(options);

  enableShortcutForm(shortcut);
}

export function enableShortcutForm(shortcut) {
  document.querySelector(`#${shortcut} input`).disabled = false;
  document
    .querySelector(`#${shortcut} .updateShortcut`)
    .removeAttribute('hidden');
  document
    .querySelector(`#${shortcut} .resetShortcut`)
    .removeAttribute('hidden');
  document
    .querySelector(`#${shortcut} .disableShortcut`)
    .removeAttribute('hidden');
  document
    .querySelector(`#${shortcut} .enableShortcut`)
    .setAttribute('hidden', true);
}
