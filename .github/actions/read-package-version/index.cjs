// Code from https://github.com/actions/runner/issues/772#issuecomment-920919080

child = require('child_process');
path = require('path');

// fork to system-installed node which is v14.17.6 at this time of writing
// this workaround can be removed once the Github actions runner supports a
// newer version of Node.js
child.fork(path.resolve(__dirname, 'dist/index.mjs'), [], { execPath: 'node' });
