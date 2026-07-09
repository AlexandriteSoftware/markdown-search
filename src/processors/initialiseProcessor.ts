import { Logger }
  from 'winston';
import { AsyncIterableQueue }
  from '../AsyncIterableQueue';
import { KbEvent }
  from '../KbEvents';
import { EditorEvent }
  from '../EditorEvents';
import MiniSearch
  from 'minisearch';
import { MiniSearchEvent }
  from '../MiniSearchEvents';
import { Action }
  from '../Types';
import { processWorkspaceEvents }
  from './processWorkspaceEvents';
import { processEditorEvents }
  from './processEditorEvents';
import { processKbEvents }
  from './processKbEvents';
import { processMiniSearchEvents }
  from './processMiniSearchEvents';

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
