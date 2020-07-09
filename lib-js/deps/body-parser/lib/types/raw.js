/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */

import { parse as bytesParse } from '../../../bytes/index.js';
import dbg from '../../../debug/index.js';
const debug = dbg('body-parser:raw');
import read from '../read.js';
import { typeis, hasBody } from '../../../type-is/index.js';


/**
 * Create a middleware to parse raw bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @api public
 */
export default function raw (options) {
  const opts = options || {};

  const inflate = opts.inflate !== false;
  const limit = typeof opts.limit !== 'number'
    ? bytesParse(opts.limit || '100kb')
    : opts.limit;
    const type = opts.type || 'application/octet-stream';
    const verify = opts.verify || false;

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function');
  }

  // create the appropriate type checking function
  const shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type;

  function parse (buf) {
    return buf;
  }

  return function rawParser (req, res, next) {
    if (req._body) {
      debug('body already parsed');
      next();
      return;
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!hasBody(req)) {
      debug('skip empty body');
      next();
      return;
    }

    debug('content-type %j', req.headers['content-type'])

    // determine if request should be parsed
    if (!shouldParse(req)) {
      debug('skip parsing');
      next();
      return;
    }

    // read
    read(req, res, next, parse, debug, {
      encoding: null,
      inflate: inflate,
      limit: limit,
      verify: verify
    });
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */
function typeChecker (type) {
  return function checkType (req) {
    return Boolean(typeis(req, type));
  }
}
