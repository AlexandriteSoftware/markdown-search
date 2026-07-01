# EditorEvents

`EditorEvents` defines data objects to support a queue of the editor events.
The editor events are based on the VS Code workspace events.

```mermaid
classDiagram

EditorEvent <|-- FolderAddedEvent
EditorEvent <|-- FolderRemovedEvent
EditorEvent <|-- FileUpdatedEvent
EditorEvent <|-- FileDeletedEvent

class EditorEvent {
    event: string
}

class FolderAddedEvent {
    event: string = 'folder-added'
    path: string
    exclude: string list
}

class FolderRemovedEvent {
    event: string = 'folder-removed'
    path: string
}

class FileUpdatedEvent {
    event: string = 'file-updated'
    path: string
}

class FileDeletedEvent {
    event: string = 'file-deleted'
    path: string
}
```
