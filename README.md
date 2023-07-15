# Markdown Full Text Search

Markdown Full Text Search is a VS Code extension that makes it easy to search for text in Markdown files. With this extension, you can quickly find the text you're looking for and link it.

## Features

- Allows searching for text in Markdown files.
- Allows adding links from search results.
- Search results are prioritized by similarity to the search phrase.
- Supports multi-folder workspaces and respects the file and search exclusions.

## Installation

Get it through Visual Studio Code marketplace: [Markdown Full Text Search](https://marketplace.visualstudio.com/items?itemName=AlexandriteSoftware.markdown-search)

## Usage

Press `Ctrl+Shift+P` to open the command palette, then look for `Markdown Search: Search in Markdown files` or `Markdown Search: Add link from search results` commands.

The command `Search in Markdown files` will open a search box where you can enter the text you want to search for. Clicking or pressing Enter on the search result opens the corresponding file in the editor.

The command `Add link from search results` will open a search box where you can enter the text you want to search for. Clicking or pressing Enter on the search result will add a link to the corresponding file in the editor. The selected text becomes a link's title.

## Release Notes

### 0.1.4

log to debug
<https://code.visualstudio.com/api/working-with-extensions/bundling-extension>

### 0.1.3

- Respect the `search.exclude` setting.
- Fix a bug where the search index was not updated when files were deleted.
- Fix a bug where the deleted file still appeared in the search results.

### 0.1.2

- Respect the `files.exclude` setting.

### 0.1.1

- Add support for adding links from the search results.
- Add filesystem watcher to update search index when files are added, or changed.

### 0.1.0

- Initial release of Markdown Full Text Search.
