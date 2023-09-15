# DEVELOPMENT

## Notes

- Run tests: `npm run test`
- Build the extension: `vsce package`

## Testing

### Temporary folders

Test temporary folders are created in the system's temporary folder. They are named `test-markdown-search/<random-id>`. They are deleted when the test suite finishes.

All temp folders are deleted automatically when the tests finish.

The approach was selected due to issues with creating individual test folders for each test. VSCode locks these folders, preventing their deletion. As a result, the temporary folder is deleted in runTest.ts after VSCode is terminated.

### Run single tests

Change the filter in `src/test/suite/index.ts`.

## Pubishing

Make sure the versions are updated in `package.json`, `CHANGELOG.md`, and `Extension.ts`.

```PowerShell
Remove-Item -Path .\out -Recurse -Force
Remove-Item -Path .\dist -Recurse -Force
vsce package
npm run test
vsce publish
```

## Versioning

The extension version is in `package.json`. The format is `major.minor.patch`.

By convention:

- `patch` is increased when there is a simple change in functionality, e.g. bugfixes of small improvements;
- `minor` is increased when there is a new feature or a significant improvement.

Increasing the `major` part of the version is decided on a case-by-case basis.

For runtime, the version is in `Extension.ts`, in `EXTENSION_VERSION`.
