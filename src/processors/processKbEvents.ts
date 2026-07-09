import { Logger }
  from 'winston';
import { Enqueuer }
  from '../AsyncIterableQueue.js';
import { KbEvent,
         isKbAddedEvent,
         isKbFileAddedEvent,
         isKbFileRemovedEvent,
         isKbFileUpdatedEvent,
         isKbRemovedEvent }
  from '../KbEvents.js';
import { MiniSearchEvent,
         IndexFile,
         RemoveFile }
  from '../MiniSearchEvents.js';

export function processKbEvents(
    log: Logger,
    queue: AsyncIterable<KbEvent>,
    enqueuer: Enqueuer<MiniSearchEvent>
  ): () => void
{
  let disposed = false;

  (async () =>
  {
    for await (const event of queue) {
      if (disposed) {
        break;
      }

      const root = event.root;

      if (isKbAddedEvent(event)) {
        for (const file of event.files) {
          enqueuer.enqueue<IndexFile>(
            { event: 'index',
              path: file,
              root });
        }
      } else if (isKbRemovedEvent(event)) {
        for (const path of event.files) {
          enqueuer.enqueue<RemoveFile>(
            { event: 'remove',
              path,
              root });
        }
      } else if (isKbFileAddedEvent(event)) {
        enqueuer.enqueue<IndexFile>(
          { event: 'index',
            path: event.path,
            root });
      } else if (isKbFileUpdatedEvent(event)) {
        enqueuer.enqueue<IndexFile>(
          { event: 'index',
            path: event.path,
            root });
      } else if (isKbFileRemovedEvent(event)) {
        enqueuer.enqueue<RemoveFile>(
          { event: 'remove',
            path: event.path,
            root });
      }
    }
  })();

  return () => { disposed = true; };
}
