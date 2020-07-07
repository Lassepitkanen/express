/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */


import { pathtoRegexp } from '../deps/path-to-regexp/index.js';
import dbg from 'debug';
const debug = dbg('express:router:layer');

/**
 * Module variables.
 * @private
 */

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Module exports.
 * @public
 */

export class Layer {
  constructor(path, options, fn) {
    if (!(this instanceof Layer)) {
      return new Layer(path, options, fn);
    }
    const opts = options || {};

    this.handle = fn;
    this.name = fn.name || '<anonymous>';;
    this.params;
    this.path;
    this.regexp = pathtoRegexp(path, this.keys = [], opts);
    this.regexpFastSlash = path === '*';
    this.regexpFastSlash = path === '/' && opts.end === false;
    this.keys;
    this.method;
    this.route;

    debug('new %o', path)
  }

  /**
   * Handle the error for the layer.
   *
   * @param {Error} error
   * @param {Request} req
   * @param {Response} res
   * @param {function} next
   * @api private
   */

  handle_error(error, req, res, next) {
    const fn = this.handle;

    if (fn.length !== 4) {
      // not a standard error handler
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return next(error);
    }

    try {
      fn(error, req, res, next);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handle the request for the layer.
   *
   * @param {Request} req
   * @param {Response} res
   * @param {function} next
   * @api private
   */
  handle_request(req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) {
      // not a standard request handler
      return next();
    }

    try {
      fn(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Check if this route matches `path`, if so
   * populate `.params`.
   *
   * @param {String} path
   * @return {Boolean}
   * @api private
   */
  match(path) {
    let match;

    if (path != null) {
      // fast path non-ending match for / (any path matches)
      if (this.regexpFastSlash) {
        this.params = {}
        this.path = ''
        return true
      }

      // fast path for * (everything matched in a param)
      if (this.regexpFastStar) {
        this.params = {'0': decode_param(path)}
        this.path = path
        return true
      }

      // match the path
      match = this.regexp.exec(path);
    }

    if (!match) {
      this.params = undefined;
      this.path = undefined;
      return false;
    }

    // store values
    this.params = {};
    this.path = match[0]

    const keys = this.keys;
    const params = this.params;

    const len = match.length;
    for (let i = 1; i < len; ++i) {
      const key = keys[i - 1];
      const prop = key.name;
      const val = decode_param(match[i])

      if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
        params[prop] = val;
      }
    }

    return true;
  }
}

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}
