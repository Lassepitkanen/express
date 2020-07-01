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


import * as path from 'path';
import * as fs from 'fs';
import dbg from 'debug';
const debug = dbg('express:view');

/**
 * Module variables.
 * @private
 */

const dirname = path.dirname;
const basename = path.basename;
const extname = path.extname;
const join = path.join;
const resolve = path.resolve;


/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 *
 * @param {string} name
 * @param {object} options
 */
export class View {
  constructor(name, options) {
    this.defaultEngine;
    this.ext;
    this.name;
    this.root;
    this.engine; // store loaded engine
    this.path; // lookup path

    const opts = options || { defaultEngine: '', root: '', engines: {}};
    this.defaultEngine = opts.defaultEngine;
    this.ext = extname(name);
    this.root = opts.root;

    if (!this.ext && !this.defaultEngine) {
      throw new Error('No default engine was specified and no extension was provided.');
    }

    let fileName = name;
    if (!this.ext) {
      // get extension from default engine name
      this.ext = this.defaultEngine[0] !== '.'
        ? '.' + this.defaultEngine
        : this.defaultEngine;

      fileName += this.ext;
    }

    if (!opts.engines[this.ext]) {
      // load engine
      const mod = this.ext.substr(1)
      debug('require "%s"', mod)

      // default engine export
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/ban-types
      const fn = require(mod).__express;

      if (typeof fn !== 'function') {
        throw new Error('Module "' + mod + '" does not provide a view engine.')
      }

      opts.engines[this.ext] = fn;
    }

    this.engine = opts.engines[this.ext];

    this.path = this.lookup(fileName);
  }

  /**
   * Lookup view by the given `name`
   *
   * @param {string} name
   * @private
   */
  lookup(name) {
    let path;
    const roots = [].concat(this.root);

    debug('lookup "%s"', name);
    const len = roots.length;
    for (let i = 0; i < len && !path; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const root = roots[i];

      // resolve the path
      const loc = resolve(root, name);
      const dir = dirname(loc);
      const file = basename(loc);

      // resolve the file
      path = this.resolve(dir, file);
    }

    return path;
  }

    /**
   * Render with the given options.
   *
   * @param {object} options
   * @param {function} callback
   */
  render(options, callback) {
    debug('render "%s"', this.path);
    this.engine(this.path, options, callback);
  }

  /**
   * Resolve the file within the given directory.
   *
   * @param {string} dir
   * @param {string} file
   * @private
   */

  resolve(dir, file) {
    const ext = this.ext;

    // <path>.<ext>
    let path = join(dir, file);
    let stat = tryStat(path);

    if (stat && stat.isFile()) {
      return path;
    }

    // <path>/index.<ext>
    path = join(dir, basename(file, ext), 'index' + ext);
    stat = tryStat(path);

    if (stat && stat.isFile()) {
      return path;
    }
  }
}

/**
 * Return a stat, maybe.
 *
 * @param {string} path
 * @return {fs.Stats}
 * @private
 */
function tryStat(path) {
  debug('stat "%s"', path);

  try {
    return fs.statSync(path);
  } catch (e) {
    return void 0;
  }
}
