/**
 * Module dependencies.
 */

import { timingSafeEqual, createHmac } from 'crypto';

/**
 * Sign the given `val` with `secret`.
 *
 * @param {String} val
 * @param {String} secret
 * @return {String}
 * @api private
 */
export function sign(val, secret){
  if ('string' != typeof val) throw new TypeError("Cookie value must be provided as a string.");
  if ('string' != typeof secret) throw new TypeError("Secret string must be provided.");
  return val + '.' + createHmac('sha256', secret)
    .update(val)
    .digest('base64')
    .replace(/\=+$/, '');
}

/**
 * Unsign and decode the given `val` with `secret`,
 * returning `false` if the signature is invalid.
 *
 * @param {String} val
 * @param {String} secret
 * @return {String|Boolean}
 * @api private
 */
export function unsign(val, secret){
  if ('string' != typeof val) throw new TypeError("Signed cookie string must be provided.");
  if ('string' != typeof secret) throw new TypeError("Secret string must be provided.");
  const str = val.slice(0, val.lastIndexOf('.'))
    , mac = exports.sign(str, secret)
    , macBuffer = Buffer.from(mac)
    , valBuffer = Buffer.alloc(macBuffer.length);

  valBuffer.write(val);
  return timingSafeEqual(macBuffer, valBuffer) ? str : false;
}
