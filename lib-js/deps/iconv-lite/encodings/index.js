"use strict";

// Update this array if you add/rename/remove files in this directory.
// We support Browserify by skipping automatic module discovery and requiring modules directly.

import internal from './internal.js';
// import utf16 from './utf16.js';
// import utf7 from './utf7.js';
// import sbcsCodec from './sbcs-codec.js';
import sbcsData from './sbcs-data.js';
import sbcsDataGenerated from './sbcs-data-generated.js';
// import dbcsCodec from './dbcs-codec.js';
import dbcsData from './dbcs-data.js';

const sbcsCodec = require('./sbcs-codec.js');
const dbcsCodec = require('./dbcs-codec.js');

const utf16 = require('./utf16.js');
const utf7 = require('./utf7.js');


const modules = [
  internal,
  utf16,
  utf7,
  sbcsCodec,
  sbcsData,
  sbcsDataGenerated,
  dbcsCodec,
  dbcsData
];

// Put all encoding/alias/codec definitions to single object and export it.
const len = modules.length;
for (let i = 0; i < len; ++i) {
  const module = modules[i];
  for (const enc in module)
    if (Object.hasOwnProperty.call(module, enc))
      exports[enc] = module[enc];
}
