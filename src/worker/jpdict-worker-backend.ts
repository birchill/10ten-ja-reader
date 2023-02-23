import Bugsnag from '@birchill/bugsnag-zero';

import { JpdictBackend, JpdictListener } from '../background/jpdict-backend';
import { JpdictEvent } from '../background/jpdict-events';
import * as events from '../background/jpdict-events';

export class JpdictWorkerBackend implements JpdictBackend {
  private worker: Worker;
  private listeners: Array<JpdictListener> = [];

  constructor() {
    this.worker = new Worker('./10ten-ja-jpdict.js');
    this.worker.onmessageerror = (event: MessageEvent) => {
      console.error(`Worker error: ${JSON.stringify(event)}`);
      void Bugsnag.notify(`Worker error: ${JSON.stringify(event)}`);
    };

    this.worker.onmessage = async (event: MessageEvent) => {
      const message = event.data as JpdictEvent;
      this.notifyListeners(message);
    };
  }

  updateDb(params: { lang: string; force: boolean }) {
    this.worker.postMessage(events.updateDb(params));
  }

  cancelUpdateDb() {
    this.worker.postMessage(events.cancelUpdateDb());
  }

  deleteDb() {
    this.worker.postMessage(events.deleteDb());
  }

  queryState() {
    this.worker.postMessage(events.queryState());
  }

  addEventListener(listener: JpdictListener) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }

  removeEventListener(listener: JpdictListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(message: JpdictEvent) {
    const listenersCopy = this.listeners.slice();
    for (const listener of listenersCopy) {
      listener(message);
    }
  }
}
