/*!
 * finalhandler
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

import dbg from '../debug/index.js';
const debug = dbg('finalhandler');
import encodeUrl from '../encodeurl/index.js';
import { escapeHtml } from '../escape-html/index.js';
import { isFinished, onFinished } from '../on-finished/index.js';
import { parseUrlOriginal } from '../parseurl/index.js';
import * as statuses from '../statuses/index.js';
import unpipe from '../unpipe/index.js';

/**
 * Module variables.
 * @private
 */
const DOUBLE_SPACE_REGEXP = /\x20{2}/g;
const NEWLINE_REGEXP = /\n/g;

/* istanbul ignore next */
const defer = typeof setImmediate === 'function'
  ? setImmediate
  : function (fn) { process.nextTick(fn.bind.apply(fn, arguments)) };

/**
 * Create a minimal HTML document.
 *
 * @param {string} message
 * @private
 */
function createHtmlDocument (message) {
  const body = escapeHtml(message)
    .replace(NEWLINE_REGEXP, '<br>')
    .replace(DOUBLE_SPACE_REGEXP, ' &nbsp;');

  return '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<title>Error</title>\n' +
    '</head>\n' +
    '<body>\n' +
    '<pre>' + body + '</pre>\n' +
    '</body>\n' +
    '</html>\n';
}



/**
 * Create a function to handle the final response.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Object} [options]
 * @return {Function}
 * @public
 */
export default function finalhandler (req, res, options) {
  const opts = options || {};

  // get environment
  const env = opts.env || process.env.NODE_ENV || 'development';

  // get error callback
  const onerror = opts.onerror;

  return function (err) {
    let headers, msg, status;


    // ignore 404 on in-flight response
    if (!err && headersSent(res)) {
      debug('cannot 404 after headers sent');
      return;
    }

    // unhandled error
    if (err) {
      // respect status code from error
      status = getErrorStatusCode(err);

      if (status === void 0) {
        // fallback to status code on response
        status = getResponseStatusCode(res);
      } else {
        // respect headers from error
        headers = getErrorHeaders(err);
      }

      // get error message
      msg = getErrorMessage(err, status, env);
    } else {
      // not found
      status = 404;
      msg = 'Cannot ' + req.method + ' ' + encodeUrl(getResourceName(req));
    }

    debug('default %s', status);

    // schedule onerror callback
    if (err && onerror) {
      defer(onerror, err, req, res);
    }

    // cannot actually respond
    if (headersSent(res)) {
      debug('cannot %d after headers sent', status);
      req.socket.destroy();
      return;
    }

    // send response
    send(req, res, status, headers, msg);
  }
}

/**
 * Get headers from Error object.
 *
 * @param {Error} err
 * @return {object}
 * @private
 */
function getErrorHeaders (err) {
  if (!err.headers || typeof err.headers !== 'object') {
    return void 0;
  }

  const headers = Object.create(null);
  const keys = Object.keys(err.headers);

  const len = keys.length;
  for (let i = 0; i < len; ++i) {
    const key = keys[i];
    headers[key] = err.headers[key];
  }

  return headers;
}

/**
 * Get message from Error object, fallback to status message.
 *
 * @param {Error} err
 * @param {number} status
 * @param {string} env
 * @return {string}
 * @private
 */

function getErrorMessage (err, status, env) {
  let msg;

  if (env !== 'production') {
    // use err.stack, which typically includes err.message
    msg = err.stack;

    // fallback to err.toString() when possible
    if (!msg && typeof err.toString === 'function') {
      msg = err.toString();
    }
  }

  return msg || statuses.message[status];
}

/**
 * Get status code from Error object.
 *
 * @param {Error} err
 * @return {number}
 * @private
 */
function getErrorStatusCode (err) {
  // check err.status
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    return err.status;
  }

  // check err.statusCode
  if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    return err.statusCode;
  }

  return void 0;
}

/**
 * Get resource name for the request.
 *
 * This is typically just the original pathname of the request
 * but will fallback to "resource" is that cannot be determined.
 *
 * @param {IncomingMessage} req
 * @return {string}
 * @private
 */
function getResourceName (req) {
  try {
    return parseUrlOriginal(req).pathname;
  } catch (e) {
    return 'resource';
  }
}

/**
 * Get status code from response.
 *
 * @param {OutgoingMessage} res
 * @return {number}
 * @private
 */
function getResponseStatusCode (res) {
  let status = res.statusCode;

  // default status code to 500 if outside valid range
  if (typeof status !== 'number' || status < 400 || status > 599) {
    status = 500;
  }

  return status;
}

/**
 * Determine if the response headers have been sent.
 *
 * @param {object} res
 * @returns {boolean}
 * @private
 */
function headersSent (res) {
  return typeof res.headersSent !== 'boolean'
    ? Boolean(res._header)
    : res.headersSent;
}

/**
 * Send response.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @param {number} status
 * @param {object} headers
 * @param {string} message
 * @private
 */
function send (req, res, status, headers, message) {
  function write () {
    // response body
    const body = createHtmlDocument(message);

    // response status
    res.statusCode = status;
    res.statusMessage = statuses.message[status];

    // response headers
    setHeaders(res, headers);

    // security headers
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // standard headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(body, 'utf8');
  }

  if (isFinished(req)) {
    write();
    return;
  }

  // unpipe everything from the request
  unpipe(req);

  // flush the request
  onFinished(req, write);
  req.resume();
}

/**
 * Set response headers from an object.
 *
 * @param {OutgoingMessage} res
 * @param {object} headers
 * @private
 */
function setHeaders (res, headers) {
  if (!headers) {
    return;
  }

  const keys = Object.keys(headers);
  const len = keys.length;
  for (var i = 0; i < len; ++i) {
    const key = keys[i]
    res.setHeader(key, headers[key])
  }
}
