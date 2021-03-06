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


import finalhandler from './deps/finalhandler/index.js';
import { Router } from './router/index.js';
import { methods } from './deps/methods/index.js';
import * as middleware  from './middleware/init.js';
import { query } from './middleware/query.js';
import dbg from './deps/debug/index.js';
const debug = dbg('express:application');
import { View } from './view.js';
import { createServer } from 'http';
import { compileETag, compileQueryParser, compileTrust } from './utils.js';
import { flatten } from './deps/array-flatten/index.js';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { Req } from './request.js';
import { Res } from './response.js';
const slice = Array.prototype.slice;


/**
 * Variable for trust proxy inheritance back-compat
 * @private
 */

const trustProxyDefaultSymbol = '@@symbol:trust_proxy_default';

/**
 * Initialize the server.
 *
 *   - setup default configuration
 *   - setup default middleware
 *   - setup route reflection methods
 *
 * @private
 */
export class App extends EventEmitter {
  constructor() {
    super();
  }

  init() {
    this.request = Object.create(new Req(), {
      app: { configurable: true, enumerable: true, writable: true, value: this }
    })

    // expose the prototype that will get set on responses
    this.response = Object.create(new Res(), {
      app: { configurable: true, enumerable: true, writable: true, value: this }
    })

    this.cache = {};
    this.engines = {};
    this.settings = {};

    this.defaultConfiguration();
  }

  /**
   * Initialize application configuration.
   * @private
   */
  defaultConfiguration() {
    const env = process.env.NODE_ENV || 'development';

    // default settings
    this.enable('x-powered-by');
    this.set('etag', 'weak');
    this.set('env', env);
    this.set('query parser', 'extended');
    this.set('subdomain offset', 2);
    this.set('trust proxy', false);

    // trust proxy inherit back-compat
    Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
      configurable: true,
      value: true
    });

    debug('booting in %s mode', env);

    this.on('mount', function onmount(parent) {
      // inherit trust proxy
      if (this.settings[trustProxyDefaultSymbol] === true
        && typeof parent.settings['trust proxy fn'] === 'function') {
        delete this.settings['trust proxy'];
        delete this.settings['trust proxy fn'];
      }

      // inherit protos
      Object.setPrototypeOf(this.request, parent.request)
      Object.setPrototypeOf(this.response, parent.response)
      Object.setPrototypeOf(this.engines, parent.engines)
      Object.setPrototypeOf(this.settings, parent.settings)
    });

    // setup locals
    this.locals = {};

    // top-most app is mounted at /
    this.mountpath = '/';

    // default locals
    this.locals.settings = this.settings;

    // default configuration
    this.set('view', View);
    this.set('views', resolve('views'));
    this.set('jsonp callback name', 'callback');

    if (env === 'production') {
      this.enable('view cache');
    }

    Object.defineProperty(this, 'router', {
      get: function() {
        throw new Error('\'app.router\' is deprecated!\nPlease see the 3.x to 4.x migration guide for details on how to update your app.');
      }
    });
  }

  /**
   * lazily adds the base router if it has not yet been added.
   *
   * We cannot add the base router in the defaultConfiguration because
   * it reads app settings which might be set after that has run.
   *
   * @private
   */
  lazyrouter() {
    if (!this._router) {
      this._router = new Router({
        caseSensitive: this.enabled('case sensitive routing'),
        strict: this.enabled('strict routing')
      });

      this._router.use(query(this.get('query parser fn')));
      this._router.use(middleware.init(this));
    }
  }

  /**
   * Dispatch a req, res pair into the application. Starts pipeline processing.
   *
   * If no callback is provided, then default error handlers will respond
   * in the event of an error bubbling through the stack.
   *
   * @private
   */
  handle(req, res, callback) {
    const router = this._router;

    // final handler
    const done = callback || finalhandler(req, res, {
      env: this.get('env'),
      onerror: this.logerror.bind(this)
    });

    // no routes
    if (!router) {
      debug('no routes defined on app');
      done();
      return;
    }

    router.handle(req, res, done);
  }

  /**
   * Proxy `Router#use()` to add middleware to the app router.
   * See Router#use() documentation for details.
   *
   * If the _fn_ parameter is an express app, then it will be
   * mounted at the _route_ specified.
   *
   * @public
   */
  use(fn) {
    let offset = 0;
    let path = '/';

    // default path to '/'
    // disambiguate app.use([fn])

    if (typeof fn !== 'function' && fn instanceof Router === false) {
      let arg = fn;

      while (Array.isArray(arg) && arg.length !== 0) {
        arg = arg[0];
      }

      // first arg is the path
      if (typeof arg !== 'function') {
        offset = 1;
        path = fn;
      }
    }

    // const fns = flatten(arguments).filter(el => {
    //   const type = typeof el;
    //   if (type === 'object' || type === 'function') {
    //     return true;
    //   }
    //   return false;
    // });

    const fns = flatten(slice.call(arguments, offset));
    if (fns.length === 0) {
      throw new TypeError('app.use() requires a middleware function')
    }
    // setup router
    this.lazyrouter();
    let router = this._router;

    fns.forEach(function (fn) {

      // non-express app
      if (!fn || !fn.handle || !fn.set) {
        return router.use(path, fn);
      }

      debug('.use app under %s', path);
      fn.mountpath = path;
      fn.parent = this;

      // restore .app property on req and res
      router.use(path, function mounted_app(req, res, next) {
        let orig = req.app;
        fn.handle(req, res, function (err) {
          Object.setPrototypeOf(req, orig.request)
          Object.setPrototypeOf(res, orig.response)
          next(err);
        });
      });

      // mounted an app
      fn.emit('mount', this);
    }, this);

    return this;
  }

  /**
   * Proxy to the app `Router#route()`
   * Returns a new `Route` instance for the _path_.
   *
   * Routes are isolated middleware stacks for specific paths.
   * See the Route api docs for details.
   *
   * @public
   */
  route(path) {
    this.lazyrouter();
    return this._router.route(path);
  }

  /**
   * Register the given template engine callback `fn`
   * as `ext`.
   *
   * By default will `require()` the engine based on the
   * file extension. For example if you try to render
   * a "foo.ejs" file Express will invoke the following internally:
   *
   *     app.engine('ejs', require('ejs').__express);
   *
   * For engines that do not provide `.__express` out of the box,
   * or if you wish to "map" a different extension to the template engine
   * you may use this method. For example mapping the EJS template engine to
   * ".html" files:
   *
   *     app.engine('html', require('ejs').renderFile);
   *
   * In this case EJS provides a `.renderFile()` method with
   * the same signature that Express expects: `(path, options, callback)`,
   * though note that it aliases this method as `ejs.__express` internally
   * so if you're using ".ejs" extensions you dont need to do anything.
   *
   * Some template engines do not follow this convention, the
   * [Consolidate.js](https://github.com/tj/consolidate.js)
   * library was created to map all of node's popular template
   * engines to follow this convention, thus allowing them to
   * work seamlessly within Express.
   *
   * @param {String} ext
   * @param {Function} fn
   * @return {app} for chaining
   * @public
   */
  engine(ext, fn) {
    if (typeof fn !== 'function') {
      throw new Error('callback function required');
    }

    // get file extension
    const extension = ext[0] !== '.'
      ? '.' + ext
      : ext;

    // store engine
    this.engines[extension] = fn;

    return this;
  }

  /**
   * Proxy to `Router#param()` with one added api feature. The _name_ parameter
   * can be an array of names.
   *
   * See the Router#param() docs for more details.
   *
   * @param {String|Array} name
   * @param {Function} fn
   * @return {app} for chaining
   * @public
   */
  param(name, fn) {
    this.lazyrouter();

    if (Array.isArray(name)) {
      const len = name.length;
      for (let i = 0; i < len; ++i) {
        this.param(name[i], fn);
      }

      return this;
    }

    this._router.param(name, fn);

    return this;
  }

  /**
   * Assign `setting` to `val`, or return `setting`'s value.
   *
   *    app.set('foo', 'bar');
   *    app.set('foo');
   *    // => "bar"
   *
   * Mounted servers inherit their parent server's settings.
   *
   * @param {String} setting
   * @param {*} [val]
   * @return {Server} for chaining
   * @public
   */
  set(setting, val) {
    if (arguments.length === 1) {
      // app.get(setting)
      return this.settings[setting];
    }

    debug('set "%s" to %o', setting, val);

    // set value
    this.settings[setting] = val;

    // trigger matched settings
    switch (setting) {
      case 'etag':
        this.set('etag fn', compileETag(val));
        break;
      case 'query parser':
        this.set('query parser fn', compileQueryParser(val));
        break;
      case 'trust proxy':
        this.set('trust proxy fn', compileTrust(val));

        // trust proxy inherit back-compat
        Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
          configurable: true,
          value: false
        });

        break;
    }

    return this;
  }

  /**
   * Return the app's absolute pathname
   * based on the parent(s) that have
   * mounted it.
   *
   * For example if the application was
   * mounted as "/admin", which itself
   * was mounted as "/blog" then the
   * return value would be "/blog/admin".
   *
   * @return {String}
   * @private
   */
  path() {
    return this.parent
      ? this.parent.path() + this.mountpath
      : '';
  }

  /**
   * Check if `setting` is enabled (truthy).
   *
   *    app.enabled('foo')
   *    // => false
   *
   *    app.enable('foo')
   *    app.enabled('foo')
   *    // => true
   *
   * @param {String} setting
   * @return {Boolean}
   * @public
   */
  enabled(setting) {
    return Boolean(this.set(setting));
  }

  /**
   * Check if `setting` is disabled.
   *
   *    app.disabled('foo')
   *    // => true
   *
   *    app.enable('foo')
   *    app.disabled('foo')
   *    // => false
   *
   * @param {String} setting
   * @return {Boolean}
   * @public
   */
  disabled(setting) {
    return !this.set(setting);
  }

  /**
   * Enable `setting`.
   *
   * @param {String} setting
   * @return {app} for chaining
   * @public
   */
  enable(setting) {
    return this.set(setting, true);
  }

  /**
   * Disable `setting`.
   *
   * @param {String} setting
   * @return {app} for chaining
   * @public
   */
  disable(setting) {
    return this.set(setting, false);
  }


  /**
   * Special-cased "all" method, applying the given route `path`,
   * middleware, and callback to _every_ HTTP method.
   *
   * @param {String} path
   * @param {Function} ...
   * @return {app} for chaining
   * @public
   */
  all(path) {
    this.lazyrouter();
    const route = this._router.route(path);
    const args = slice.call(arguments, 1);

    const len = methods.length;
    for (let i = 0; i < len; ++i) {
      route[methods[i]].apply(route, args);
    }

    return this;
  }



  /**
   * Render the given view `name` name with `options`
   * and a callback accepting an error and the
   * rendered template string.
   *
   * Example:
   *
   *    app.render('email', { name: 'Tobi' }, function(err, html){
   *      // ...
   *    })
   *
   * @param {String} name
   * @param {Object|Function} options or fn
   * @param {Function} callback
   * @public
   */
  render(name, options, callback) {
    const cache = this.cache;
    let done = callback;
    const engines = this.engines;
    let opts = options;
    const renderOptions = {};
    let view;

    // support callback function as second arg
    if (typeof options === 'function') {
      done = options;
      opts = {};
    }

    // merge app.locals
    Object.assign(renderOptions, this.locals);

    // merge options._locals
    if (opts._locals) {
      Object.assign(renderOptions, opts._locals);
    }

    // merge options
    Object.assign(renderOptions, opts);

    // set .cache unless explicitly provided
    if (renderOptions.cache == null) {
      renderOptions.cache = this.enabled('view cache');
    }

    // primed cache
    if (renderOptions.cache) {
      view = cache[name];
    }

    // view
    if (!view) {
      const View = this.get('view');

      view = new View(name, {
        defaultEngine: this.get('view engine'),
        root: this.get('views'),
        engines: engines
      });

      if (!view.path) {
        const dirs = Array.isArray(view.root) && view.root.length > 1
          ? 'directories "' + view.root.slice(0, -1).join('", "') + '" or "' + view.root[view.root.length - 1] + '"'
          : 'directory "' + view.root + '"'
        const err = new Error('Failed to lookup view "' + name + '" in views ' + dirs);
        err.view = view;
        return done(err);
      }

      // prime the cache
      if (renderOptions.cache) {
        cache[name] = view;
      }
    }

    // render
    tryRender(view, renderOptions, done);
  }

  /**
   * Listen for connections.
   *
   * A node `http.Server` is returned, with this
   * application (which is a `Function`) as its
   * callback. If you wish to create both an HTTP
   * and HTTPS server you may do so with the "http"
   * and "https" modules as shown here:
   *
   *    var http = require('http')
   *      , https = require('https')
   *      , express = require('express')
   *      , app = express();
   *
   *    http.createServer(app).listen(80);
   *    https.createServer({ ... }, app).listen(443);
   *
   * @return {http.Server}
   * @public
   */
  listen() {
    const server = createServer(this);
    return server.listen.apply(server, arguments);
  }


  /**
   * Log error using console.error.
   *
   * @param {Error} err
   * @private
   */

  logerror(err) {
    /* istanbul ignore next */
    if (this.get('env') !== 'test') console.error(err.stack || err.toString());
  }
}


/**
 * Delegate `.VERB(...)` calls to `router.VERB(...)`.
 */
methods.forEach(function(method){
  App.prototype[method] = function(path){
    if (method === 'get' && arguments.length === 1) {
      // app.get(setting)
      return this.set(path);
    }

    this.lazyrouter();
    const route = this._router.route(path);
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});


/**
 * Try rendering a view.
 * @private
 */

function tryRender(view, options, callback) {
  try {
    view.render(options, callback);
  } catch (err) {
    callback(err);
  }
}
