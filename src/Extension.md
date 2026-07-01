# Extension

Diagram of the extension's data flow:

```mermaid
flowchart TB

A[vscode] -->|processWorkspaceEvents| B[Editor Events Queue]
B -->|processEditorEvents| C[KB Events Queue]
C -->|processKbEvents| D[MiniSearch Commands Queue]
D -->|processMiniSearchEvents| E[MiniSearch Index]
```
