import { Logger }
  from 'winston';
import { Enqueuer }
  from './AsyncIterableQueue';
import { KbEvent,
         isKbAddedEvent,
         isKbFileAddedEvent,
         isKbFileRemovedEvent,
         isKbFileUpdatedEvent,
         isKbRemovedEvent }
  from './KbEvents';
import { MiniSearchCommand }
  from './MiniSearchCommands';

export function translateKbEventsToMiniSearchCommands(
    log: Logger,
    queue: AsyncIterable<KbEvent>,
    enqueuer: Enqueuer<MiniSearchCommand>
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
          enqueuer.enqueue(
            { action: 'index',
              path: file,
              root });
        }
      } else if (isKbRemovedEvent(event)) {
        for (const path of event.files) {
          enqueuer.enqueue(
            { action: 'remove',
              path,
              root });
        }
      } else if (isKbFileAddedEvent(event)) {
        enqueuer.enqueue(
          { action: 'index',
            path: event.path,
            root });
      } else if (isKbFileUpdatedEvent(event)) {
        enqueuer.enqueue(
          { action: 'index',
            path: event.path,
            root });
      } else if (isKbFileRemovedEvent(event)) {
        enqueuer.enqueue(
          { action: 'remove',
            path: event.path,
            root });
      }
    }
  })();

  return () => { disposed = true; };
}
