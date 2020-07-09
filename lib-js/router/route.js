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
import dbg from '../deps/debug/index.js';
const debug = dbg('express:router:route');
import { flatten } from '../deps/array-flatten/index.js';
import { Layer } from './layer.js';
import { methods } from '../deps/methods/index.js';

/**
 * Module variables.
 * @private
 */
const slice = Array.prototype.slice;
const toString = Object.prototype.toString;


/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @public
 */
export class Route {
  constructor(path) {
    this.path = path;
    this.stack = [];

    debug('new %o', path)

    // route handlers for various http methods
    this.methods = {};
  }

  /**
   * Determine if the route handles a given method.
   * @private
   */
  _handles_method(method) {
    if (this.methods._all) {
      return true;
    }

    let name = method.toLowerCase();

    if (name === 'head' && !this.methods['head']) {
      name = 'get';
    }

    return Boolean(this.methods[name]);
  }

  /**
   * @return {Array} supported HTTP methods
   * @private
   */

  _options() {
    const methods = Object.keys(this.methods);

    // append automatic head
    if (this.methods.get && !this.methods.head) {
      methods.push('head');
    }
    const len = methods.length
    for (let i = 0; i < len; ++i) {
      // make upper case
      methods[i] = methods[i].toUpperCase();
    }
    return methods;
  }

  /**
   * dispatch req, res into this route
   * @private
   */

  dispatch(req, res, done) {
    let idx = 0;
    const stack = this.stack;
    if (stack.length === 0) {
      return done();
    }

    let method = req.method.toLowerCase();
    if (method === 'head' && !this.methods['head']) {
      method = 'get';
    }

    req.route = this;

    next();

    function next(err) {
      // signal to exit route
      if (err && err === 'route') {
        return done();
      }

      // signal to exit router
      if (err && err === 'router') {
        return done(err)
      }

      const layer = stack[idx++];
      if (!layer) {
        return done(err);
      }

      if (layer.method && layer.method !== method) {
        return next(err);
      }

      if (err) {
        layer.handle_error(err, req, res, next);
      } else {
        layer.handle_request(req, res, next);
      }
    }
  }

  /**
   * Add a handler for all HTTP verbs to this route.
   *
   * Behaves just like middleware and can respond or call `next`
   * to continue processing.
   *
   * You can use multiple `.all` call to add multiple handlers.
   *
   *   function check_something(req, res, next){
   *     next();
   *   };
   *
   *   function validate_user(req, res, next){
   *     next();
   *   };
   *
   *   route
   *   .all(validate_user)
   *   .all(check_something)
   *   .get(function(req, res, next){
   *     res.send('hello world');
   *   });
   *
   * @param {function} handler
   * @return {Route} for chaining
   * @api public
   */

  all() {
    const handles = flatten(slice.call(arguments));

    const len = handles.length;
    for (let i = 0; i < len; ++i) {
      let handle = handles[i];

      if (typeof handle !== 'function' ) {
        let type = toString.call(handle);
        let msg = 'Route.all() requires a callback function but got a ' + type
        throw new TypeError(msg);
      }

      let layer = new Layer('/', {}, handle);
      layer.method = undefined;

      this.methods._all = true;
      this.stack.push(layer);
    }

    return this;
  }
}

methods.forEach(function(method){
  Route.prototype[method] = function(){
    const handles = flatten(slice.call(arguments));

    const len = handles.length;
    for (let i = 0; i < len; ++i) {
      const handle = handles[i];

      if (typeof handle !== 'function' && typeof handle !== 'object') {
        const type = toString.call(handle);
        const msg = 'Route.' + method + '() requires a callback function but got a ' + type
        throw new Error(msg);
      }

      debug('%s %o', method, this.path)

      const layer = new Layer('/', {}, handle);
      layer.method = method;

      this.methods[method] = true;
      this.stack.push(layer);
    }

    return this;
  };
});
