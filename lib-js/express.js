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
 */
import bodyParser from './deps/body-parser/index.js';
import { App } from './application.js';
import { Route as route } from './router/route.js';
import { Router as router } from './router/index.js';
import { Req } from './request.js';
import { Res } from './response.js';
import { query } from './middleware/query.js';
import serveStatic from './deps/serve-static/index.js';


/**
 * Expose `createApplication()`.
 */

exports = module.exports = createApplication;

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */

function createApplication() {
  const app = function (req, res, next) {
    app.handle(req, res, next);
  }

  Object.setPrototypeOf(app, new App());

  app.init();
  return app;
}

/**
 * Expose the prototypes.
 */
export const application = App;
export const request = Req;
export const response = Res;

/**
 * Expose constructors.
 */
export const Route = route;
export const Router = router;

/**
 * Expose middleware
 */
export const json = bodyParser.json;
export const query = query;
export const raw = bodyParser.raw;
export const static = serveStatic;
export const text = bodyParser.text;
export const urlencoded = bodyParser.urlencoded;


/**
 * Replace removed middleware with an appropriate error message.
 */

const removedMiddlewares = [
  'bodyParser',
  'compress',
  'cookieSession',
  'session',
  'logger',
  'cookieParser',
  'favicon',
  'responseTime',
  'errorHandler',
  'timeout',
  'methodOverride',
  'vhost',
  'csrf',
  'directory',
  'limit',
  'multipart',
  'staticCache'
]

removedMiddlewares.forEach(function (name) {
  Object.defineProperty(exports, name, {
    get: function () {
      throw new Error('Most middleware (like ' + name + ') is no longer bundled with Express and must be installed separately. Please see https://github.com/senchalabs/connect#middleware.');
    },
    configurable: true
  });
});
