# DEVELOPMENT

## Notes

- Run tests: `npm run test`
- Build the extension: `vsce package`

### Temporary folders

Test temporary folders are created in the system's temporary folder. They are named `test-markdown-search/<random-id>`. They are deleted when the test suite finishes.

All temp folders are deleted automatically when the tests finish.

The approach with creating test folders per test failed, because VSCode locks the folders and they cannot be deleted. Therefore, the current approach is to delete the test folders after the test executable terminates.

## Build

```PowerShell
Remove-Item -Path .\out -Recurse -Force
Remove-Item -Path .\dist -Recurse -Force
vsce package
npm run test
```

## Versioning

The extension version is in `package.json`. The format is `major.minor.patch`.

By convention:

- `patch` is increased when there is a simple change in functionality, e.g. bugfixes of small improvements;
- `minor` is increased when there is a new feature or a significant improvement.

Increasing the `major` part of the version is decided on a case-by-case basis.
