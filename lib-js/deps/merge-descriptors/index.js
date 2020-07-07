/*!
 * merge-descriptors
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'


/**
 * Module variables.
 * @private
 */

const hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * Merge the property descriptors of `src` into `dest`
 *
 * @param {object} dest Object to add descriptors to
 * @param {object} src Object to clone descriptors from
 * @param {boolean} [redefine=true] Redefine `dest` properties with `src` properties
 * @returns {object} Reference to dest
 * @public
 */

export function merge(dest, src, redefine) {
  if (!dest) {
    throw new TypeError('argument dest is required');
  }

  if (!src) {
    throw new TypeError('argument src is required');
  }

  if (redefine === void 0) {
    // Default to true
    redefine = true;
  }

  Object.getOwnPropertyNames(src).forEach(name => {
    if (!redefine && hasOwnProperty.call(dest, name)) {
      // Skip desriptor
      return;
    }

    // Copy descriptor
    const descriptor = Object.getOwnPropertyDescriptor(src, name)
    Object.defineProperty(dest, name, descriptor);
  })

  return dest;
}
