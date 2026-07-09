import { Logger }
  from 'winston';
import { AsyncIterableQueue }
  from '../AsyncIterableQueue.js';
import { KbEvent }
  from '../KbEvents.js';
import { EditorEvent }
  from '../EditorEvents.js';
import MiniSearch
  from 'minisearch';
import { MiniSearchEvent }
  from '../MiniSearchEvents.js';
import { Action }
  from '../Types.js';
import { processWorkspaceEvents }
  from './processWorkspaceEvents.js';
import { processEditorEvents }
  from './processEditorEvents.js';
import { processKbEvents }
  from './processKbEvents.js';
import { processMiniSearchEvents }
  from './processMiniSearchEvents.js';

export function initialiseProcessor(
    logger: Logger,
    miniSearch: MiniSearch
  ): Action
{
  const editorEventsQueue =
    new AsyncIterableQueue<EditorEvent>();

  const kbEventsQueue =
    new AsyncIterableQueue<KbEvent>();

  const miniSearchQueue =
    new AsyncIterableQueue<MiniSearchEvent>();

  const disposeWorkspaceEventProcessor =
    processWorkspaceEvents(
      logger,
      editorEventsQueue);
  
  const disposeEditorEventProcessor =
    processEditorEvents(
      logger,
      editorEventsQueue,
      kbEventsQueue);
  
  const disposeKbEventProcessor =
    processKbEvents(
      logger,
      kbEventsQueue,
      miniSearchQueue);
  
  const disposeMiniSearchEventProcessor =
    processMiniSearchEvents(
      logger,
      miniSearchQueue,
      miniSearch);

  const dispose =
    (
      ): void =>
    {
      disposeWorkspaceEventProcessor();
      disposeEditorEventProcessor();
      disposeKbEventProcessor();
      disposeMiniSearchEventProcessor();

      editorEventsQueue.dispose();
      kbEventsQueue.dispose();
      miniSearchQueue.dispose();
    };

    return dispose;
}
