/*!
 * unpipe
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'


/**
 * Determine if there are Node.js pipe-like data listeners.
 * @private
 */

function hasPipeDataListeners(stream) {
  const listeners = stream.listeners('data');

  const len = listeners.length;
  for (let i = 0; i < len; ++i) {
    if (listeners[i].name === 'ondata') {
      return true;
    }
  }

  return false;
}

/**
 * Unpipe a stream from all destinations.
 *
 * @param {object} stream
 * @public
 */

export default function unpipe(stream) {
  if (!stream) {
    throw new TypeError('argument stream is required');
  }

  if (typeof stream.unpipe === 'function') {
    // new-style
    stream.unpipe();
    return;
  }

  // Node.js 0.8 hack
  if (!hasPipeDataListeners(stream)) {
    return;
  }

  let listener;
  let listeners = stream.listeners('close');

  const len = listeners.length;
  for (let i = 0; i < len; ++i) {
    listener = listeners[i];

    if (listener.name !== 'cleanup' && listener.name !== 'onclose') {
      continue;
    }

    // invoke the listener
    listener.call(stream);
  }
}
