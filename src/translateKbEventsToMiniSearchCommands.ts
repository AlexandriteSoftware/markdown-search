import { Logger } from 'winston';
import { Enqueuer } from './AsyncIterableQueue';
import
{
  KbEvent,
  isKbAddedEvent,
  isKbFileAddedEvent,
  isKbFileRemovedEvent,
  isKbFileUpdatedEvent,
  isKbRemovedEvent
} from './KbEvents';
import { MiniSearchCommand } from './MiniSearchCommands';

export function translateKbEventsToMiniSearchCommands
  (log: Logger,
    queue: AsyncIterable<KbEvent>,
    enqueuer: Enqueuer<MiniSearchCommand>)
  : () => void
{
  let disposed = false;

  (async () =>
  {
    for await (const event of queue) {
      if (disposed) {
        break;
      }

      if (isKbAddedEvent(event)) {
        for (const file of event.files) {
          enqueuer.enqueue({
            action: 'index',
            path: file,
            root: event.root
          });
        }
      } else if (isKbRemovedEvent(event)) {
        for (const file of event.files) {
          enqueuer.enqueue({
            action: 'remove',
            path: file,
            root: event.root
          });
        }
      } else if (isKbFileAddedEvent(event)) {
        enqueuer.enqueue({
          action: 'index',
          path: event.path,
          root: event.root
        });
      } else if (isKbFileUpdatedEvent(event)) {
        enqueuer.enqueue({
          action: 'index',
          path: event.path,
          root: event.root
        });
      } else if (isKbFileRemovedEvent(event)) {
        enqueuer.enqueue({
          action: 'remove',
          path: event.path,
          root: event.root
        });
      }
    }
  })();

  return () => { disposed = true; };
}
