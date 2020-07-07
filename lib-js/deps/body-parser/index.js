/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

const deprecate = require('depd')('body-parser');
import json from './lib/types/json.js';
import raw from './lib/types/raw.js';
import text from './lib/types/text.js';
import urlencoded from './lib/types/urlencoded.js';


export default {
  json: json,
  raw: raw,
  text: text,
  urlencoded: urlencoded
}

/**
 * @typedef Parsers
 * @type {function}
 * @property {function} json
 * @property {function} raw
 * @property {function} text
 * @property {function} urlencoded
 */

/**
 * Module exports.
 * @type {Parsers}
 */


/**
 * Create a middleware to parse json and urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @deprecated
 * @public
 */
export function bodyParser(options) {
  const opts = {};

  // exclude type option
  if (options) {
    for (const prop in options) {
      if (prop !== 'type') {
        opts[prop] = options[prop];
      }
    }
  }

  const _urlencoded = urlencoded(opts);
  const _json = json(opts);

  return function bodyParser (req, res, next) {
    _json(req, res, function (err) {
      if (err) return next(err);
      _urlencoded(req, res, next);
    });
  }
}


