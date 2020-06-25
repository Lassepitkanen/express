/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */


/**
 * Module dependencies.
 * @private
 */
import * as pathRegexp from 'path-to-regexp';
import dbg from 'debug';
const debug = dbg('express:router:layer');

/**
 * Module variables.
 * @private
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;

class Layer {
  // eslint-disable-next-line @typescript-eslint/ban-types
  private handle: Function;
  private name: string;
  private params: Record<string, unknown>;
  private path: string;
  private regexp: RegExp;
  private regexpFastStar: boolean;
  private regexpFastSlash: boolean;
  private keys: Record<string, string>[];
  // eslint-disable-next-line @typescript-eslint/ban-types
  public method: Function;

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(path: string, options: Record<string, unknown>, fn: Function) {
    if (!(this instanceof Layer)) {
      return new Layer(path, options, fn);
    }

    debug('new %o', path)
    const opts = options || {};

    this.handle = fn;
    this.name = fn.name || '<anonymous>';
    this.params = void 0;
    this.path = void 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.regexp = pathRegexp(path, this.keys = [], opts);

    // set fast path flags
    this.regexpFastSlash = path === '*';
    this.regexpFastSlash = path === '/' && opts.end === false;
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  public handle_error(error: Error, req: Request, res: Response, next: Function) {
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  public handle_request(req: Request, res: Response, next: Function) {
    const fn = this.handle;

    if (fn.length > 3) {
      // not a standard request handler
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
  public match(path: string): boolean {
    let match: RegExpExecArray;

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

interface CustomError {
  name: string;
  message: string;
  stack?: string;
  status: number;
  statusCode: number;
}


/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */
function decode_param(val: string): string {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      const error: CustomError = { name: err.name, message: 'Failed to decode param \'' + val + '\'', status: 400, statusCode: 400 };
      throw error;
    }
    else {
      throw err;
    }

  }
}


/**
 * Module exports.
 * @public
 */
module.exports = Layer;
