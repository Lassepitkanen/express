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

import { parseUrl } from '../deps/parseurl/index.js';
import qs from '../deps/qs/index.js';

/**
 * @param {Object} options
 * @return {Function}
 * @api public
 */

export function query(options) {
  let opts = Object.assign({}, options)
  let queryparse = qs.parse;

  if (typeof options === 'function') {
    queryparse = options;
    opts = void 0;
  }

  if (opts !== void 0 && opts.allowPrototypes === void 0) {
    // back-compat for qs module
    opts.allowPrototypes = true;
  }

  return function query(req, res, next){
    if (!req.query) {
      const val = parseUrl(req).query;
      req.query = queryparse(val, opts);
    }

    next();
  };
}
