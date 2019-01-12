# How to contribute

**Table of content**
* [In General](#in-general)
* [Translations](#translations)

## In General

If you've never contributed to a project before, [this guide](https://github.com/firstcontributions/first-contributions/blob/master/README.md) is a good place to start. It's also available in multiple languages.

## Translations

The translations are located in `/src/_locales/`. Beneath this directory each language is split into its own directory. In the language directory the translations are structured in the `messages.json` file.

For deeper insight it's recommended to read the [Internationalization guide for web extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization).

### Update translation

1. Open the messages.json file for the target language.
1. Alter the `message` text for the translation to update.

### Add language

1. Create a directory with the short language code. Allowed are identifiers like `de_DE` or `de`, where the latter is the fallback.
1. Copy the `messages.json` file from the directory `en` in the new directory.
1. Replace all `message`s.
