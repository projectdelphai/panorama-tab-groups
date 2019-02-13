/**
 * Helper function to create a new element with the given attributes and children
 */
export function new_element(name, attributes, children) {
    const e = document.createElement(name);
    for (const key in attributes) {
        if (key == 'content') {
            e.appendChild(document.createTextNode(attributes[key]));
        }
        else {
            e.setAttribute(key.replace(/_/g, '-'), attributes[key]);
        }
    }
    for (const child of children || []) {
        e.appendChild(child);
    }
    return e;
}

/**
 * Extract correct plural form for a translated string.
 * For insight for the plural rules see:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_and_Plurals#List_of_Plural_Rules
 */
export function getPluralForm(pluralCount = 1, translatedString = '') {
  const count = parseInt(pluralCount);
  const pluralRule = parseInt(browser.i18n.getMessage('pluralRule'));
  const pluralForms = string.split('|');

  if (pluralForms.length === 1) {
    return translatedString;
  }

  switch (pluralRule) {
    /*
     * Rule #0 [everything]
     */
    case 0:
      return pluralForms[0];
      break;
    /*
     * Rule #1 [is 1]|[everything else]
     */
    case 1:
      if (count === 1) {
        return pluralForms[0];
      } else {
        return pluralForms[1];
      }
      break;
      break;
    /*
     * Rule #2 [1-2]|[everything else]
     */
    case 2:
      if (count < 2) {
        return pluralForms[0];
      } else {
        return pluralForms[1];
      }
      break;
    /*
     * Rule #7 [is 1, excluding 11]|[2-4, excluding 12-14]|[everything else]
     */
    case 7:
      if (count % 10 === 1 && count % 100 !== 11) {
        return pluralForms[0];
      } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 > 20)) {
        return pluralForms[1];
      } else {
        return pluralForms[2];
      }
      break;
    /*
     * Rule #9 [is 1]|[2-4, excluding 12-14]|[everything else]
     */
    case 9:
      if (count === 1) {
        return pluralForms[0];
      } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 > 20)) {
        return pluralForms[1];
      } else {
        return pluralForms[2];
      }
      break;
    default:
      return translatedString;
  }
}
