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
const bodyParser = require('body-parser');
import { EventEmitter } from 'events';
const mixin = require('merge-descriptors');
// const proto = require('./application');
import { App } from './application.js';
import { Route as route } from './router/route.js';
import { Router as router } from './router/index.js';
// var router = require('./router/index.js');
const req = require('./request');
// import { Req } from './request';
const res = require('./response');
// import { Res } from './response.js';


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
  const app = function(req, res, next) {
    app.handle(req, res, next);
  };

  mixin(app, EventEmitter.prototype, false);
  mixin(app, App.prototype, false);

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  app.init();
  return app;
}

/**
 * Expose the prototypes.
 */
export const application = App;
export const request = req;
export const response = res;

/**
 * Expose constructors.
 */
export const Route = route;
export const Router = router;

/**
 * Expose middleware
 */
export const json = bodyParser.json;
exports.query = require('./middleware/query');
export const raw = bodyParser.raw
exports.static = require('serve-static');
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
