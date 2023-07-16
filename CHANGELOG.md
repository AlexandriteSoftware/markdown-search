# Change Log

All notable changes to the extension will be documented in this file.

This file is organised according to [Keep a Changelog](http://keepachangelog.com/).

## 0.1.8

- Added `none` log level
- Set search keyswords from the selected text

## 0.1.7

- Refactor internal code to use async queues to fix concurrent index updates.

## 0.1.6

- Fix: renaming a folder does not update the search index.

## 0.1.5

- Hotfix for the incorrect extension package.

## 0.1.4

- Addded configuration for debug level logging.
- Pack the extension with eslint

## 0.1.3

- Respect the `search.exclude` setting.
- Fix a bug where the search index was not updated when files were deleted.
- Fix a bug where the deleted file still appeared in the search results.

## 0.1.2

- Respect the `files.exclude` setting.

## 0.1.1

- Add support for adding links from the search results.
- Add filesystem watcher to update search index when files are added, or changed.

## 0.1.0

- Initial release of Markdown Full Text Search.
