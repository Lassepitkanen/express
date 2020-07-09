/*!
 * body-parser
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

import { parse as bytesParse } from '../../../bytes/index.js';
import { parse } from '../../../content-type/index.js';
import { createError } from '../../../http-errors/index.js';
import dbg from '../../../debug/index.js';
const debug = dbg('body-parser');
import read from '../read.js';
import { typeis, hasBody } from '../../../type-is/index.js';


/**
 * Cache of parser modules.
 */
const parsers = {};

/**
 * Create a middleware to parse urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @public
 */
export default function urlencoded (options) {
  const opts = options || {}

  const extended = opts.extended !== false;
  const inflate = opts.inflate !== false;
  const limit = typeof opts.limit !== 'number'
    ? bytesParse(opts.limit || '100kb')
    : opts.limit
    const type = opts.type || 'application/x-www-form-urlencoded';
    const verify = opts.verify || false;

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function');
  }

  // create the appropriate query parser
  const queryparse = extended
    ? extendedparser(opts)
    : simpleparser(opts);

  // create the appropriate type checking function
  const shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type;

  function parse (body) {
    return body.length
      ? queryparse(body)
      : {};
  }

  return function urlencodedParser (req, res, next) {
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

    // assert charset
    const charset = getCharset(req) || 'utf-8';
    if (charset !== 'utf-8') {
      debug('invalid charset');
      next(createError(415, 'unsupported charset "' + charset.toUpperCase() + '"', {
        charset: charset,
        type: 'charset.unsupported'
      }));
      return;
    }

    // read
    read(req, res, next, parse, debug, {
      debug: debug,
      encoding: charset,
      inflate: inflate,
      limit: limit,
      verify: verify
    });
  }
}

/**
 * Get the extended query parser.
 *
 * @param {object} options
 */
function extendedparser (options) {
  let parameterLimit = options.parameterLimit !== void 0
    ? options.parameterLimit
    : 1000
    const parse = parser('qs');

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse (body) {
    const paramCount = parameterCount(body, parameterLimit)

    if (paramCount === void 0) {
      debug('too many parameters')
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many'
      })
    }

    const arrayLimit = Math.max(100, paramCount);

    debug('parse extended urlencoding');
    return parse(body, {
      allowPrototypes: true,
      arrayLimit: arrayLimit,
      depth: Infinity,
      parameterLimit: parameterLimit
    });
  }
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */
function getCharset (req) {
  try {
    return (parse(req).parameters.charset || '').toLowerCase();
  } catch (e) {
    return void 0;
  }
}

/**
 * Count the number of parameters, stopping once limit reached
 *
 * @param {string} body
 * @param {number} limit
 * @api private
 */
function parameterCount (body, limit) {
  let count = 0
  let index = 0

  while ((index = body.indexOf('&', index)) !== -1) {
    ++count;
    ++index;

    if (count === limit) {
      return void 0;
    }
  }

  return count;
}

/**
 * Get parser for module name dynamically.
 *
 * @param {string} name
 * @return {function}
 * @api private
 */
function parser (name) {
  let mod = parsers[name];

  if (mod !== void 0) {
    return mod.parse;
  }

  // this uses a switch for static require analysis
  switch (name) {
    case 'qs':
      mod = require('qs');
      break;
    case 'querystring':
      mod = require('querystring');
      break;
  }

  // store to prevent invoking require()
  parsers[name] = mod;

  return mod.parse;
}

/**
 * Get the simple query parser.
 *
 * @param {object} options
 */
function simpleparser (options) {
  let parameterLimit = options.parameterLimit !== void 0
    ? options.parameterLimit
    : 1000;
    const parse = parser('querystring');

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number');
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0;
  }

  return function queryparse (body) {
    const paramCount = parameterCount(body, parameterLimit);

    if (paramCount === void 0) {
      debug('too many parameters');
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many'
      });
    }

    debug('parse urlencoding');
    return parse(body, void 0, void 0, { maxKeys: parameterLimit });
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
