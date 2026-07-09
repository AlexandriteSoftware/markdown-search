# Markdown Full Text Search

[![alexandritesoftware.markdown-search][1]][2]

[Markdown Full Text Search][2] is a Visual Studio Code extension designed for
efficient text searching within Markdown knowledge bases. It creates and
maintains an index of all Markdown files in your workspace, enabling rapid
searches for words or phrases.

> Built with [Alexandrite Software Library][3] - a set of high-quality,
performant JavaScript libraries for everyday use.

[1]: https://vsmarketplacebadges.dev/version/alexandritesoftware.markdown-search.png
[2]: https://marketplace.visualstudio.com/items?itemName=alexandritesoftware.markdown-search
[3]: https://github.com/AlexandriteSoftware/asljs

## Features

- Indexes all Markdown files in the workspace for fast searching.
- Keeps indexes up to date with changes in the workspace.
- Provides a keyword search for words or phrases in Markdown files.
- Allows you to add links to the documents you found.
- Shows you the closest matches to your search at the top.
- Follows VSCode settings for ignoring files and folders.

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

[31]: <https://raw.githubusercontent.com/AlexandriteSoftware/markdown-search/refs/heads/main/docs/README_command_palette.png>
[32]: <https://raw.githubusercontent.com/AlexandriteSoftware/markdown-search/refs/heads/main/docs/README_add_link_from_search_results.gif>

## Configuration

Markdown Full Text Search has the following configuration options:

- `markdown-search.logging.level`: The logging level. Possible values are
`debug`, `info`, `notice`, `warning`, `error`, `crit`, `alert`, `emerg`, `none`.
Default is `info`.

## Credits

Markdown Full Text Search is created with [MiniSearch][51], a tiny but powerful
in-memory fulltext search engine for JavaScript, created by [Luca Ongaro][52].

[51]: https://github.com/lucaong/minisearch
[52]: https://lucaongaro.eu/

## Releases

See the [CHANGELOG][61] for the details about the changes in each release.

[61]: <./CHANGELOG.md>
