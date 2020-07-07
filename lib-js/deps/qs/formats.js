'use strict';

const replace = String.prototype.replace;
const percentTwenties = /%20/g;


import utils from './utils.js';

const Format = {
  RFC1738: 'RFC1738',
  RFC3986: 'RFC3986'
};

export default utils.assign(
  {
    'default': Format.RFC3986,
    formatters: {
      RFC1738: function (value) {
        return replace.call(value, percentTwenties, '+');
      },
      RFC3986: function (value) {
        return String(value);
      }
    }
  },
  Format
);
