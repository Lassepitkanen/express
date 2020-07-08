/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */
import { Buffer } from 'buffer';
import { contentDisposition } from './deps/content-disposition/index.js';
const deprecate = require('depd')('express');
import encodeUrl from './deps/encodeurl/index.js';
import { escapeHtml } from './deps/escape-html/index.js';
import * as http from 'http';
import { onFinished } from './deps/on-finished/index.js';
import * as statuses from './deps/statuses/index.js';
import { sign } from './deps/cookie-signature/index.js';
import { setCharset, normalizeType, normalizeTypes, isAbsolute } from './utils.js';
import { serialize } from './deps/cookie/index.js';
import { mime } from './deps/mime/index.js';
import { send } from './deps/send/index.js'
import { resolve, extname } from 'path';
import { vary } from './deps/vary/index.js';

const charsetRegExp = /;\s*charset\s*=/;
// /**
//  * Response prototype.
//  * @public
//  */

// const res = Object.create(http.ServerResponse.prototype)

// /**
//  * Module exports.
//  * @public
//  */

// module.exports = res


export class res extends http.ServerResponse {
  constructor() {
    super(new http.IncomingMessage());
  }

  /**
   * Set status `code`.
   *
   * @param {Number} code
   * @return {ServerResponse}
   * @public
   */
  status(code) {
    this.statusCode = code;
    return this;
  }

  /**
   * Set Link header field with the given `links`.
   *
   * Examples:
   *
   *    res.links({
   *      next: 'http://api.example.com/users?page=2',
   *      last: 'http://api.example.com/users?page=5'
   *    });
   *
   * @param {Object} links
   * @return {ServerResponse}
   * @public
   */
  links(links){
    let link = this.get('Link') || '';
    if (link) link += ', ';
    return this.set('Link', link + Object.keys(links).map(function(rel){
      return '<' + links[rel] + '>; rel="' + rel + '"';
    }).join(', '));
  }

  /**
   * Send a response.
   *
   * Examples:
   *
   *     res.send(Buffer.from('wahoo'));
   *     res.send({ some: 'json' });
   *     res.send('<p>some html</p>');
   *
   * @param {string|number|boolean|object|Buffer} body
   * @public
   */
  send(body) {
    let chunk = body;
    let encoding;
    const req = this.req;
    let type;

    // settings
    const app = this.app;

    // allow status / body
    if (arguments.length === 2) {
      // res.send(body, status) backwards compat
      if (typeof arguments[0] !== 'number' && typeof arguments[1] === 'number') {
        deprecate('res.send(body, status): Use res.status(status).send(body) instead');
        this.statusCode = arguments[1];
      } else {
        deprecate('res.send(status, body): Use res.status(status).send(body) instead');
        this.statusCode = arguments[0];
        chunk = arguments[1];
      }
    }

    // disambiguate res.send(status) and res.send(status, num)
    if (typeof chunk === 'number' && arguments.length === 1) {
      // res.send(status) will set status message as text string
      if (!this.get('Content-Type')) {
        this.type('txt');
      }

      deprecate('res.send(status): Use res.sendStatus(status) instead');
      this.statusCode = chunk;
      chunk = statuses.message[chunk];
    }

    switch (typeof chunk) {
      // string defaulting to html
      case 'string':
        if (!this.get('Content-Type')) {
          this.type('html');
        }
        break;
      case 'boolean':
      case 'number':
      case 'object':
        if (chunk === null) {
          chunk = '';
        } else if (Buffer.isBuffer(chunk)) {
          if (!this.get('Content-Type')) {
            this.type('bin');
          }
        } else {
          return this.json(chunk);
        }
        break;
    }

    // write strings in utf-8
    if (typeof chunk === 'string') {
      encoding = 'utf8';
      type = this.get('Content-Type');

      // reflect this in content-type
      if (typeof type === 'string') {
        this.set('Content-Type', setCharset(type, 'utf-8'));
      }
    }

    // determine if ETag should be generated
    const etagFn = app.get('etag fn')
    const generateETag = !this.get('ETag') && typeof etagFn === 'function'

    // populate Content-Length
    let len
    if (chunk !== void 0) {
      if (Buffer.isBuffer(chunk)) {
        // get length of Buffer
        len = chunk.length
      } else if (!generateETag && chunk.length < 1000) {
        // just calculate length when no ETag + small chunk
        len = Buffer.byteLength(chunk, encoding)
      } else {
        // convert chunk to Buffer and calculate
        chunk = Buffer.from(chunk, encoding)
        encoding = void 0;
        len = chunk.length
      }

      this.set('Content-Length', len);
    }

    // populate ETag
    let etag;
    if (generateETag && len !== void 0) {
      if ((etag = etagFn(chunk, encoding))) {
        this.set('ETag', etag);
      }
    }

    // freshness
    if (req.fresh) this.statusCode = 304;

    // strip irrelevant headers
    if (204 === this.statusCode || 304 === this.statusCode) {
      this.removeHeader('Content-Type');
      this.removeHeader('Content-Length');
      this.removeHeader('Transfer-Encoding');
      chunk = '';
    }

    if (req.method === 'HEAD') {
      // skip body for HEAD
      this.end();
    } else {
      // respond
      this.end(chunk, encoding);
    }

    return this;
  }

  /**
   * Send JSON response.
   *
   * Examples:
   *
   *     res.json(null);
   *     res.json({ user: 'tj' });
   *
   * @param {string|number|boolean|object} obj
   * @public
   */
  json(obj) {
    let val = obj;

    // allow status / body
    if (arguments.length === 2) {
      // res.json(body, status) backwards compat
      if (typeof arguments[1] === 'number') {
        deprecate('res.json(obj, status): Use res.status(status).json(obj) instead');
        this.statusCode = arguments[1];
      } else {
        deprecate('res.json(status, obj): Use res.status(status).json(obj) instead');
        this.statusCode = arguments[0];
        val = arguments[1];
      }
    }

    // settings
    const app = this.app;
    const escape = app.get('json escape')
    const replacer = app.get('json replacer');
    const spaces = app.get('json spaces');
    const body = stringify(val, replacer, spaces, escape)

    // content-type
    if (!this.get('Content-Type')) {
      this.set('Content-Type', 'application/json');
    }

    return this.send(body);
  }

  /**
   * Send JSON response with JSONP callback support.
   *
   * Examples:
   *
   *     res.jsonp(null);
   *     res.jsonp({ user: 'tj' });
   *
   * @param {string|number|boolean|object} obj
   * @public
   */
  jsonp(obj) {
    let val = obj;

    // allow status / body
    if (arguments.length === 2) {
      // res.json(body, status) backwards compat
      if (typeof arguments[1] === 'number') {
        deprecate('res.jsonp(obj, status): Use res.status(status).json(obj) instead');
        this.statusCode = arguments[1];
      } else {
        deprecate('res.jsonp(status, obj): Use res.status(status).jsonp(obj) instead');
        this.statusCode = arguments[0];
        val = arguments[1];
      }
    }

    // settings
    const app = this.app;
    const escape = app.get('json escape')
    const replacer = app.get('json replacer');
    const spaces = app.get('json spaces');
    let body = stringify(val, replacer, spaces, escape)
    let callback = this.req.query[app.get('jsonp callback name')];

    // content-type
    if (!this.get('Content-Type')) {
      this.set('X-Content-Type-Options', 'nosniff');
      this.set('Content-Type', 'application/json');
    }

    // fixup callback
    if (Array.isArray(callback)) {
      callback = callback[0];
    }

    // jsonp
    if (typeof callback === 'string' && callback.length !== 0) {
      this.set('X-Content-Type-Options', 'nosniff');
      this.set('Content-Type', 'text/javascript');

      // restrict callback charset
      callback = callback.replace(/[^\[\]\w$.]/g, '');

      // replace chars not allowed in JavaScript that are in JSON
      body = body
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

      // the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
      // the typeof check is just to reduce client error noise
      body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
    }

    return this.send(body);
  }

  /**
   * Send given HTTP status code.
   *
   * Sets the response status to `statusCode` and the body of the
   * response to the standard description from node's http.STATUS_CODES
   * or the statusCode number if no description.
   *
   * Examples:
   *
   *     res.sendStatus(200);
   *
   * @param {number} statusCode
   * @public
   */
  sendStatus(statusCode) {
    const body = statuses.message[statusCode] || String(statusCode)

    this.statusCode = statusCode;
    this.type('txt');

    return this.send(body);
  }

  /**
   * Transfer the file at the given `path`.
   *
   * Automatically sets the _Content-Type_ response header field.
   * The callback `callback(err)` is invoked when the transfer is complete
   * or when an error occurs. Be sure to check `res.sentHeader`
   * if you wish to attempt responding, as the header and some data
   * may have already been transferred.
   *
   * Options:
   *
   *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
   *   - `root`     root directory for relative filenames
   *   - `headers`  object of headers to serve with file
   *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
   *
   * Other options are passed along to `send`.
   *
   * Examples:
   *
   *  The following example illustrates how `res.sendFile()` may
   *  be used as an alternative for the `static()` middleware for
   *  dynamic situations. The code backing `res.sendFile()` is actually
   *  the same code, so HTTP cache support etc is identical.
   *
   *     app.get('/user/:uid/photos/:file', function(req, res){
   *       var uid = req.params.uid
   *         , file = req.params.file;
   *
   *       req.user.mayViewFilesFrom(uid, function(yes){
   *         if (yes) {
   *           res.sendFile('/uploads/' + uid + '/' + file);
   *         } else {
   *           res.send(403, 'Sorry! you cant see that.');
   *         }
   *       });
   *     });
   *
   * @public
   */
  sendFile(path, options, callback) {
    let done = callback;
    const req = this.req;
    const res = this;
    const next = req.next;
    let opts = options || {};

    if (!path) {
      throw new TypeError('path argument is required to res.sendFile');
    }

    if (typeof path !== 'string') {
      throw new TypeError('path must be a string to res.sendFile')
    }

    // support function as second arg
    if (typeof options === 'function') {
      done = options;
      opts = {};
    }

    if (!opts.root && !isAbsolute(path)) {
      throw new TypeError('path must be absolute or specify root to res.sendFile');
    }

    // create file stream
    const pathname = encodeURI(path);
    const file = send(req, pathname, opts);

    // transfer
    sendfile(res, file, opts, function (err) {
      if (done) return done(err);
      if (err && err.code === 'EISDIR') return next();

      // next() all but write errors
      if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
        next(err);
      }
    });
  }

  /**
   * Transfer the file at the given `path` as an attachment.
   *
   * Optionally providing an alternate attachment `filename`,
   * and optional callback `callback(err)`. The callback is invoked
   * when the data transfer is complete, or when an error has
   * ocurred. Be sure to check `res.headersSent` if you plan to respond.
   *
   * Optionally providing an `options` object to use with `res.sendFile()`.
   * This function will set the `Content-Disposition` header, overriding
   * any `Content-Disposition` header passed as header options in order
   * to set the attachment and filename.
   *
   * This method uses `res.sendFile()`.
   *
   * @public
   */
  download(path, filename, options, callback) {
    let done = callback;
    let name = filename;
    let opts = options || null;

    // support function as second or third arg
    if (typeof filename === 'function') {
      done = filename;
      name = null;
      opts = null;
    } else if (typeof options === 'function') {
      done = options;
      opts = null;
    }

    // set Content-Disposition when file is sent
    const headers = {
      'Content-Disposition': contentDisposition(name || path)
    };

    // merge user-provided headers
    if (opts && opts.headers) {
      const keys = Object.keys(opts.headers);
      const len = keys.length;
      for (let i = 0; i < len; ++i) {
        const key = keys[i]
        if (key.toLowerCase() !== 'content-disposition') {
          headers[key] = opts.headers[key]
        }
      }
    }

    // merge user-provided options
    opts = Object.create(opts);
    opts.headers = headers;

    // Resolve the full path for sendFile
    const fullPath = resolve(path);

    // send file
    return this.sendFile(fullPath, opts, done)
  }

  /**
   * Set _Content-Type_ response header with `type` through `mime.lookup()`
   * when it does not contain "/", or set the Content-Type to `type` otherwise.
   *
   * Examples:
   *
   *     res.type('.html');
   *     res.type('html');
   *     res.type('json');
   *     res.type('application/json');
   *     res.type('png');
   *
   * @param {String} type
   * @return {ServerResponse} for chaining
   * @public
   */
  contentType(type) {
    const ct = type.indexOf('/') === -1
      ? mime.lookup(type)
      : type;

    return this.set('Content-Type', ct);
  }

  type(type) {
    const ct = type.indexOf('/') === -1
      ? mime.lookup(type)
      : type;

    return this.set('Content-Type', ct);
  }

  /**
   * Respond to the Acceptable formats using an `obj`
   * of mime-type callbacks.
   *
   * This method uses `req.accepted`, an array of
   * acceptable types ordered by their quality values.
   * When "Accept" is not present the _first_ callback
   * is invoked, otherwise the first match is used. When
   * no match is performed the server responds with
   * 406 "Not Acceptable".
   *
   * Content-Type is set for you, however if you choose
   * you may alter this within the callback using `res.type()`
   * or `res.set('Content-Type', ...)`.
   *
   *    res.format({
   *      'text/plain': function(){
   *        res.send('hey');
   *      },
   *
   *      'text/html': function(){
   *        res.send('<p>hey</p>');
   *      },
   *
   *      'appliation/json': function(){
   *        res.send({ message: 'hey' });
   *      }
   *    });
   *
   * In addition to canonicalized MIME types you may
   * also use extnames mapped to these types:
   *
   *    res.format({
   *      text: function(){
   *        res.send('hey');
   *      },
   *
   *      html: function(){
   *        res.send('<p>hey</p>');
   *      },
   *
   *      json: function(){
   *        res.send({ message: 'hey' });
   *      }
   *    });
   *
   * By default Express passes an `Error`
   * with a `.status` of 406 to `next(err)`
   * if a match is not made. If you provide
   * a `.default` callback it will be invoked
   * instead.
   *
   * @param {Object} obj
   * @return {ServerResponse} for chaining
   * @public
   */
  format(obj){
    const req = this.req;
    const next = req.next;

    const fn = obj.default;
    if (fn) delete obj.default;
    const keys = Object.keys(obj);

    const key = keys.length > 0
      ? req.accepts(keys)
      : false;

    this.vary("Accept");

    if (key) {
      this.set('Content-Type', normalizeType(key).value);
      obj[key](req, this, next);
    } else if (fn) {
      fn();
    } else {
      const err = new Error('Not Acceptable');
      err.status = err.statusCode = 406;
      err.types = normalizeTypes(keys).map(function(o){ return o.value });
      next(err);
    }

    return this;
  }

  /**
   * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
   *
   * @param {String} filename
   * @return {ServerResponse}
   * @public
   */

  attachment(filename) {
    if (filename) {
      this.type(extname(filename));
    }

    this.set('Content-Disposition', contentDisposition(filename));

    return this;
  }

  /**
   * Append additional header `field` with value `val`.
   *
   * Example:
   *
   *    res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
   *    res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
   *    res.append('Warning', '199 Miscellaneous warning');
   *
   * @param {String} field
   * @param {String|Array} val
   * @return {ServerResponse} for chaining
   * @public
   */
  append(field, val) {
    const prev = this.get(field);
    let value = val;

    if (prev) {
      // concat the new and prev vals
      value = Array.isArray(prev) ? prev.concat(val)
        : Array.isArray(val) ? [prev].concat(val)
        : [prev, val];
    }

    return this.set(field, value);
  }

  /**
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    res.set('Foo', ['bar', 'baz']);
   *    res.set('Accept', 'application/json');
   *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * Aliased as `res.header()`.
   *
   * @param {String|Object} field
   * @param {String|Array} val
   * @return {ServerResponse} for chaining
   * @public
   */
  set(field, val) {
    if (arguments.length === 2) {
      var value = Array.isArray(val)
        ? val.map(String)
        : String(val);

      // add charset to content-type
      if (field.toLowerCase() === 'content-type') {
        if (Array.isArray(value)) {
          throw new TypeError('Content-Type cannot be set to an Array');
        }
        if (!charsetRegExp.test(value)) {
          var charset = mime.charsets.lookup(value.split(';')[0]);
          if (charset) value += '; charset=' + charset.toLowerCase();
        }
      }

      this.setHeader(field, value);
    } else {
      for (var key in field) {
        this.set(key, field[key]);
      }
    }
    return this;
  }
  header(field, val) {
    if (arguments.length === 2) {
      var value = Array.isArray(val)
        ? val.map(String)
        : String(val);

      // add charset to content-type
      if (field.toLowerCase() === 'content-type') {
        if (Array.isArray(value)) {
          throw new TypeError('Content-Type cannot be set to an Array');
        }
        if (!charsetRegExp.test(value)) {
          var charset = mime.charsets.lookup(value.split(';')[0]);
          if (charset) value += '; charset=' + charset.toLowerCase();
        }
      }

      this.setHeader(field, value);
    } else {
      for (var key in field) {
        this.set(key, field[key]);
      }
    }
    return this;
  }

  /**
   * Get value for header `field`.
   *
   * @param {String} field
   * @return {String}
   * @public
   */

  get(field){
    return this.getHeader(field);
  }

  /**
   * Clear cookie `name`.
   *
   * @param {String} name
   * @param {Object} [options]
   * @return {ServerResponse} for chaining
   * @public
   */
  clearCookie(name, options) {
    const opts = Object.assign({ expires: new Date(1), path: '/' }, options);
    return this.cookie(name, '', opts);
  }

  /**
   * Set cookie `name` to `value`, with the given `options`.
   *
   * Options:
   *
   *    - `maxAge`   max-age in milliseconds, converted to `expires`
   *    - `signed`   sign the cookie
   *    - `path`     defaults to "/"
   *
   * Examples:
   *
   *    // "Remember Me" for 15 minutes
   *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
   *
   *    // same as above
   *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
   *
   * @param {String} name
   * @param {String|Object} value
   * @param {Object} [options]
   * @return {ServerResponse} for chaining
   * @public
   */
  cookie(name, value, options) {
    const opts = Object.assign({}, options);
    const secret = this.req.secret;
    const signed = opts.signed;

    if (signed && !secret) {
      throw new Error('cookieParser("secret") required for signed cookies');
    }

    var val = typeof value === 'object'
      ? 'j:' + JSON.stringify(value)
      : String(value);

    if (signed) {
      val = 's:' + sign(val, secret);
    }

    if ('maxAge' in opts) {
      opts.expires = new Date(Date.now() + opts.maxAge);
      opts.maxAge /= 1000;
    }

    if (opts.path == null) {
      opts.path = '/';
    }

    this.append('Set-Cookie', serialize(name, String(val), opts));

    return this;
  }

  /**
   * Set the location header to `url`.
   *
   * The given `url` can also be "back", which redirects
   * to the _Referrer_ or _Referer_ headers or "/".
   *
   * Examples:
   *
   *    res.location('/foo/bar').;
   *    res.location('http://example.com');
   *    res.location('../login');
   *
   * @param {String} url
   * @return {ServerResponse} for chaining
   * @public
   */
  location(url) {
    let loc = url;

    // "back" is an alias for the referrer
    if (url === 'back') {
      loc = this.req.get('Referrer') || '/';
    }

    // set location
    return this.set('Location', encodeUrl(loc));
  }

  /**
   * Redirect to the given `url` with optional response `status`
   * defaulting to 302.
   *
   * The resulting `url` is determined by `res.location()`, so
   * it will play nicely with mounted apps, relative paths,
   * `"back"` etc.
   *
   * Examples:
   *
   *    res.redirect('/foo/bar');
   *    res.redirect('http://example.com');
   *    res.redirect(301, 'http://example.com');
   *    res.redirect('../login'); // /blog/post/1 -> /blog/login
   *
   * @public
   */

  redirect(url) {
    let address = url;
    let body;
    let status = 302;

    // allow status / url
    if (arguments.length === 2) {
      if (typeof arguments[0] === 'number') {
        status = arguments[0];
        address = arguments[1];
      } else {
        deprecate('res.redirect(url, status): Use res.redirect(status, url) instead');
        status = arguments[1];
      }
    }

    // Set location header
    address = this.location(address).get('Location');

    // Support text/{plain,html} by default
    this.format({
      text: function(){
        body = statuses.message[status] + '. Redirecting to ' + address
      },

      html: function(){
        var u = escapeHtml(address);
        body = '<p>' + statuses.message[status] + '. Redirecting to <a href="' + u + '">' + u + '</a></p>'
      },

      default: function(){
        body = '';
      }
    });

    // Respond
    this.statusCode = status;
    this.set('Content-Length', Buffer.byteLength(body));

    if (this.req.method === 'HEAD') {
      this.end();
    } else {
      this.end(body);
    }
  }

  /**
   * Add `field` to Vary. If already present in the Vary set, then
   * this call is simply ignored.
   *
   * @param {Array|String} field
   * @return {ServerResponse} for chaining
   * @public
   */
  vary(field){
    // checks for back-compat
    if (!field || (Array.isArray(field) && !field.length)) {
      deprecate('res.vary(): Provide a field name');
      return this;
    }

    vary(this, field);
    return this;
  }

  /**
   * Render `view` with the given `options` and optional callback `fn`.
   * When a callback function is given a response will _not_ be made
   * automatically, otherwise a response of _200_ and _text/html_ is given.
   *
   * Options:
   *
   *  - `cache`     boolean hinting to the engine it should cache
   *  - `filename`  filename of the view being rendered
   *
   * @public
   */
  render(view, options, callback) {
    const app = this.req.app;
    let done = callback;
    let opts = options || {};
    const req = this.req;
    const self = this;

    // support callback function as second arg
    if (typeof options === 'function') {
      done = options;
      opts = {};
    }

    // merge res.locals
    opts._locals = self.locals;

    // default callback to respond
    done = done || function (err, str) {
      if (err) return req.next(err);
      self.send(str);
    };

    // render
    app.render(view, opts, done);
  }
}

  /**
 * Stringify JSON, like JSON.stringify, but v8 optimized, with the
 * ability to escape characters that can trigger HTML sniffing.
 *
 * @param {*} value
 * @param {function} replaces
 * @param {number} spaces
 * @param {boolean} escape
 * @returns {string}
 * @private
 */

function stringify(value, replacer, spaces, escape) {
  // v8 checks arguments.length for optimizing simple call
  // https://bugs.chromium.org/p/v8/issues/detail?id=4730
  let json = replacer || spaces
    ? JSON.stringify(value, replacer, spaces)
    : JSON.stringify(value);

  if (escape) {
    json = json.replace(/[<>&]/g, function (c) {
      switch (c.charCodeAt(0)) {
        case 0x3c:
          return '\\u003c'
        case 0x3e:
          return '\\u003e'
        case 0x26:
          return '\\u0026'
        /* istanbul ignore next: unreachable default */
        default:
          return c
      }
    })
  }

  return json
}

// pipe the send file stream
function sendfile(res, file, options, callback) {
  let done = false;
  let streaming;

  // request aborted
  function onaborted() {
    if (done) return;
    done = true;

    const err = new Error('Request aborted');
    err.code = 'ECONNABORTED';
    callback(err);
  }

  // directory
  function ondirectory() {
    if (done) return;
    done = true;

    const err = new Error('EISDIR, read');
    err.code = 'EISDIR';
    callback(err);
  }

  // errors
  function onerror(err) {
    if (done) return;
    done = true;
    callback(err);
  }

  // ended
  function onend() {
    if (done) return;
    done = true;
    callback();
  }

  // file
  function onfile() {
    streaming = false;
  }

  // finished
  function onfinish(err) {
    if (err && err.code === 'ECONNRESET') return onaborted();
    if (err) return onerror(err);
    if (done) return;

    setImmediate(function () {
      if (streaming !== false && !done) {
        onaborted();
        return;
      }

      if (done) return;
      done = true;
      callback();
    });
  }

  // streaming
  function onstream() {
    streaming = true;
  }

  file.on('directory', ondirectory);
  file.on('end', onend);
  file.on('error', onerror);
  file.on('file', onfile);
  file.on('stream', onstream);
  onFinished(res, onfinish);

  if (options.headers) {
    // set headers on successful transfer
    file.on('headers', function headers(res) {
      const obj = options.headers;
      const keys = Object.keys(obj);
      const len = keys.length;
      for (let i = 0; i < len; ++i) {
        const k = keys[i];
        res.setHeader(k, obj[k]);
      }
    });
  }

  // pipe
  file.pipe(res);
}

