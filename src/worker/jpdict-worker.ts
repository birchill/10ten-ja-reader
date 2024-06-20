import { JpdictLocalBackend } from '../background/jpdict-backend';
import { JpdictEvent, notifyError } from '../background/jpdict-events';

declare let self: DedicatedWorkerGlobalScope;

const backend = new JpdictLocalBackend();

backend.addEventListener((event: JpdictEvent) => {
  try {
    self.postMessage(event);
  } catch (e) {
    console.log('Error posting message');
    console.log(e);
  }
});

self.onmessage = async (event: MessageEvent) => {
  // We seem to get random events here occasionally. Not sure where they come
  // from.
  if (!event.data) {
    return;
  }

  switch ((event.data as JpdictEvent).type) {
    case 'querystate':
      void backend.queryState();
      break;

    case 'update':
      void backend.updateDb({ lang: event.data.lang, force: event.data.force });
      break;

    case 'cancelupdate':
      void backend.cancelUpdateDb();
      break;

    case 'delete':
      void backend.deleteDb();
      break;
  }
};

self.onerror = (e) => {
  self.postMessage(notifyError({ error: e.error || e }));
};
