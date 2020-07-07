/*!
 * destroy
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */
import { ReadStream } from 'fs';
import { Stream } from 'stream';


/**
 * Destroy a stream.
 *
 * @param {object} stream
 * @public
 */
export default function (stream) {
  if (stream instanceof ReadStream) {
    return destroyReadStream(stream);
  }

  if (!(stream instanceof Stream)) {
    return stream;
  }

  if (typeof stream.destroy === 'function') {
    stream.destroy();
  }

  return stream;
}

/**
 * Destroy a ReadStream.
 *
 * @param {object} stream
 * @private
 */
function destroyReadStream(stream) {
  stream.destroy();

  if (typeof stream.close === 'function') {
    // node.js core bug work-around
    stream.on('open', onOpenClose);
  }

  return stream;
}

/**
 * On open handler to close stream.
 * @private
 */
function onOpenClose() {
  if (typeof this.fd === 'number') {
    // actually close down the fd
    this.close();
  }
}
