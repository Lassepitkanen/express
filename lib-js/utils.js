/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @api private
 */


import { contentDisposition as ContentDisposition } from './deps/content-disposition/index.js';
import { etag as Etag } from './deps/etag/index.js';
import { flatten as Flatten } from './deps/array-flatten/index.js';
import { Buffer } from 'buffer';
import { parse, format } from './deps/content-type/index.js';
import { mime } from './deps/mime/index.js';
import { compile } from './deps/proxy-addr/index.js';
import qs from './deps/qs/index.js';
import { parse as querystringParse } from 'querystring';


/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */
export const etag = createETagGenerator({ weak: false })

/**
 * Return weak ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */
export const wetag = createETagGenerator({ weak: true })

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */
export function isAbsolute(path){
  if ('/' === path[0]) return true;
  if (':' === path[1] && ('\\' === path[2] || '/' === path[2])) return true; // Windows device path
  if ('\\\\' === path.substring(0, 2)) return true; // Microsoft Azure absolute path
}

/**
 * Flatten the given `arr`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */
export const flatten = Flatten;

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 * @api private
 */
export function normalizeType(type) {
  return ~type.indexOf('/')
    ? acceptParams(type)
    : { value: mime.lookup(type), params: {} };
}

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 * @api private
 */
export function normalizeTypes(types){
  const ret = [];
  const len = types.length;
  for (let i = 0; i < len; ++i) {
    ret.push(normalizeType(types[i]));
  }
  return ret;
}

/**
 * Generate Content-Disposition header appropriate for the filename.
 * non-ascii filenames are urlencoded and a filename* parameter is added
 *
 * @param {String} filename
 * @return {String}
 * @api private
 */
export const contentDisposition = ContentDisposition;

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */
function acceptParams(str, index) {
  const parts = str.split(/ *; */);
  const ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };

  for (let i = 1; i < parts.length; ++i) {
    const pms = parts[i].split(/ *= */);
    if ('q' === pms[0]) {
      ret.quality = parseFloat(pms[1]);
    } else {
      ret.params[pms[0]] = pms[1];
    }
  }

  return ret;
}

/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 * @api private
 */
export function compileETag(val) {
  let fn;

  if (typeof val === 'function') {
    return val;
  }

  switch (val) {
    case true:
      fn = wetag;
      break;
    case false:
      break;
    case 'strong':
      fn = etag;
      break;
    case 'weak':
      fn = wetag;
      break;
    default:
      throw new TypeError('unknown value for etag function: ' + val);
  }

  return fn;
}

/**
 * Compile "query parser" value to function.
 *
 * @param  {String|Function} val
 * @return {Function}
 * @api private
 */
export function compileQueryParser(val) {
  let fn;

  if (typeof val === 'function') {
    return val;
  }

  switch (val) {
    case true:
      fn = querystringParse;
      break;
    case false:
      fn = newObject;
      break;
    case 'extended':
      fn = parseExtendedQueryString;
      break;
    case 'simple':
      fn = querystringParse;
      break;
    default:
      throw new TypeError('unknown value for query parser function: ' + val);
  }

  return fn;
}

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 * @api private
 */
export function compileTrust(val) {
  if (typeof val === 'function') return val;

  if (val === true) {
    // Support plain true/false
    return function(){ return true };
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return function(a, i){ return i < val };
  }

  if (typeof val === 'string') {
    // Support comma-separated values
    val = val.split(/ *, */);
  }

  return compile(val || []);
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */
export function setCharset(type, charset) {
  if (!type || !charset) {
    return type;
  }

  // parse type
  const parsed = parse(type);

  // set charset
  parsed.parameters.charset = charset;

  // format type
  return format(parsed);
}

/**
 * Create an ETag generator function, generating ETags with
 * the given options.
 *
 * @param {object} options
 * @return {function}
 * @private
 */
function createETagGenerator (options) {
  return function generateETag (body, encoding) {
    const buf = !Buffer.isBuffer(body)
      ? Buffer.from(body, encoding)
      : body

    return Etag(buf, options)
  }
}

/**
 * Parse an extended query string with qs.
 *
 * @return {Object}
 * @private
 */

function parseExtendedQueryString(str) {
  return qs.parse(str, {
    allowPrototypes: true
  });
}

/**
 * Return new empty object.
 *
 * @return {Object}
 * @api private
 */

function newObject() {
  return {};
}
