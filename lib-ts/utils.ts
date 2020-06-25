/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */


/**
 * Module dependencies.
 * @api private
 */

// var Buffer = require('safe-buffer').Buffer
import * as contentDispos from 'content-disposition';
import * as contentType from 'content-type';
import * as depd from 'depd';
const deprecate = depd('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const arrayFlatten = require('array-flatten');
import { mime } from 'send';
import * as ETag from 'etag';
import * as proxyaddr from 'proxy-addr';
import * as qs from 'qs';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const querystring = require('querystring');
// import safeBuffer from 'safe-buffer';
// const Buffer = safeBuffer.Buffer


/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */
export const etag = createETagGenerator({ weak: false });


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
export function isAbsolute(path: string): boolean {
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const flatten = deprecate.function(arrayFlatten,
  'utils.flatten: use array-flatten npm module instead');

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 * @api private
 */
export function normalizeType(type: string): Record<string, unknown> {
  return ~type.indexOf('/')
    ? acceptParams(type, void 0)
    : { value: mime.lookup(type) , params: {} };
}

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 * @api private
 */
export function normalizeTypes(types: string[]): Array<Record<string, unknown>> {
  const ret: Array<Record<string, unknown>> = [];
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const contentDisposition = deprecate.function(contentDispos,
  'utils.contentDisposition: use content-disposition npm module instead');

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function acceptParams(str: string, index: string|number) {
  const parts = str.split(/ *; */);
  const ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };
  const len = parts.length;
  for (let i = 1; i < len; ++i) {
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
// eslint-disable-next-line @typescript-eslint/ban-types
export function compileETag(val: boolean|string|Function): Function {
  // eslint-disable-next-line @typescript-eslint/ban-types
  let fn: Function;

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
// eslint-disable-next-line @typescript-eslint/ban-types
export function compileQueryParser(val: boolean|string|Function): Function {
  // eslint-disable-next-line @typescript-eslint/ban-types
  let fn: Function;
  if (typeof val === 'function') {
    return val;
  }

  switch (val) {
    case true:
      fn = querystring.parse;
      break;
    case false:
      fn = newObject;
      break;
    case 'extended':
      fn = parseExtendedQueryString;
      break;
    case 'simple':
      fn = querystring.parse;
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
// eslint-disable-next-line @typescript-eslint/ban-types
export function compileTrust(val: boolean|string|number|string[]|Function): Function {
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

  return proxyaddr.compile(val || []);
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */
export function setCharset(type: string, charset: string): string {
  if (!type || !charset) {
    return type;
  }

  // parse type
  const parsed = contentType.parse(type);

  // set charset
  parsed.parameters.charset = charset;

  // format type
  return contentType.format(parsed);
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
  return function generateETag(body, encoding) {
    const buf = !Buffer.isBuffer(body)
      ? Buffer.from(body, encoding)
      : body

    return ETag(buf, options)
  }
}

/**
 * Parse an extended query string with qs.
 *
 * @return {Object}
 * @private
 */
function parseExtendedQueryString(str: string) {
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
// eslint-disable-next-line @typescript-eslint/ban-types
function newObject(): Object {
  return {};
}
