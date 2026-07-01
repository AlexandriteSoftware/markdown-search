# Markdown Full Text Search

[![alexandritesoftware.markdown-search][1]][2]

[Markdown Full Text Search][2] is a Visual Studio Code extension designed for
efficient text searching within Markdown files. This extension allows users to
effortlessly locate specific text and generate links to it.

[1]: https://vsmarketplacebadges.dev/version/alexandritesoftware.markdown-search.png
[2]: https://marketplace.visualstudio.com/items?itemName=alexandritesoftware.markdown-search

## Features

- Allows you find words or phrases in Markdown files.
- Allows you add links to the words or phrases you found.
- Shows you the closest matches to your search at the top.
- Works with multiple folders and follows your rules for skipping files and
  folders.

## Installation

Get it from Visual Studio Code marketplace: [Markdown Full Text Search][21].

[21]: https://marketplace.visualstudio.com/items?itemName=alexandritesoftware.markdown-search

## Usage

Press `Ctrl+Shift+P` to open the command palette. Then, search for either the
"Markdown Search: Search in Markdown files" or "Markdown Search: Add link from
search results" commands.

![demo: command palette][31]

The `Search in Markdown files` command opens a search box where you can input
the text you're seeking. By clicking on a search result or pressing Enter,
you'll open the relevant file in the editor.

The `Add link from search results` command also opens a search box for text
entry. Clicking on a search result or pressing Enter will create a link in
the editor to the relevant file. The selected text becomes the title of
this link.

![demo: add link from search results][32]

Search results will be displayed immediately if you open the search command with
selected text.

Markdown Full Text Search adheres to the project settings for excluding specific
files and folders from the project and search operations, i.e. `files.exclude`
and `search.exclude` in your `settings.json` file.

Unless the logging level is set to `none`, the extension creates
"Markdown Full Text Search" output channel and logs its activity there.

[31]: docs/demo%20-%20command%20palette.png
[32]: docs/demo%20-%20add%20link%20from%20search%20results.gif

## Configuration

Markdown Full Text Search has the following configuration options:

- `markdown-search.logging.level`: The logging level. Possible values are
`debug`, `info`, `notice`, `warning`, `error`, `crit`, `alert`, `emerg`, `none`.
Default is `info`.

## Credits

Markdown Full Text Search is created with [MiniSearch][51], a tiny but powerful
in-memory fulltext search engine for JavaScript, created by [Luca Ongaro][52].

Markdown Full Text Search is created for you by Alexandrite Software, a software
development consultancy based in the United Kingdom.

[51]: https://github.com/lucaong/minisearch
[52]: https://lucaongaro.eu/

## Releases

See the [CHANGELOG][61] for the details about the changes in each release.

[61]: CHANGELOG.md
