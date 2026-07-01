import fsp
  from 'fs/promises';
import MiniSearch
  from 'minisearch';
import { Logger }
  from 'winston';
import { MiniSearchCommand,
         isIndexFile,
         isRemoveFile }
  from './MiniSearchCommands';

export function processMiniSearchCommands(
    log: Logger,
    queue: AsyncIterable<MiniSearchCommand>,
    miniSearch: MiniSearch
  ): () => void
{
  const context =
    'processMiniSearchCommands';

  let disposed = false;

  (async () =>
  {
    log.debug(
      '[%s] starting the main loop',
      context);

    for await (const event of queue) {
      if (disposed) {
        break;
      }

      log.debug(
        '[%s] received event: %s',
        context,
        JSON.stringify(event));

      if (isIndexFile(event)) {
        await addFileToSearchIndex(
          event.path,
          event.root);
      } else if (isRemoveFile(event)) {
        removePathFromSearchIndex(
          event.path,
          event.root);
      }
    }
  })();

  return () => { disposed = true; };

  async function addFileToSearchIndex(
      path: string,
      root: string
    ): Promise<boolean>
  {
    log.debug(
      '[%s] addFileToSearchIndex(%s, %s)',
      context,
      path,
      root);

    const fileFullPath =
      root + path;

    let content: string;

    try {
      content =
        await fsp.readFile(
          fileFullPath,
          { encoding: 'utf8' });
    } catch {
      // It is not expected but it is possible, e.g. a file
      // was added and then quickly deleted. Do not process
      // it further and just return.
      return false;
    }

    // delete the document, if necessary
    if (miniSearch.has(fileFullPath)) {
      try {
        miniSearch.discard(fileFullPath);
      } catch (e) {
        log.debug(
          '[%s] addFileToSearchIndex(...): %s',
          context,
          (e || "").toString());
      }
    }

    // add the document
    miniSearch.add(
      { id: fileFullPath,
        title: path.substring(path.lastIndexOf('/') + 1),
        path: path,
        text: content });

    return true;
  }

  function removePathFromSearchIndex(
      path: string,
      root: string
    ): void
  {
    log.debug(
      '[%s] removePathFromSearchIndex(%s, %s)',
      context,
      path,
      root);

    const fileFullPath = root + path;

    try {
      miniSearch.discard(
        fileFullPath);
    } catch (e) {
      log.debug(
        '[%s] removePathFromSearchIndex(...): %s',
        context,
        (e || "").toString());
    }
  }
}
