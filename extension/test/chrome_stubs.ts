import * as sinonChrome from 'sinon-chrome';
window.chrome = sinonChrome as unknown as typeof chrome;
