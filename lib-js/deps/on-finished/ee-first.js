/*!
 * ee-first
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

'use strict'



/**
 * Get the first event in a set of event emitters and event pairs.
 *
 * @param {array} stuff
 * @param {function} done
 * @public
 */

export function first(stuff, done) {
  if (!Array.isArray(stuff)) {
    throw new TypeError('arg must be an array of [ee, events...] arrays');
  }

  const cleanups = [];
  const len = stuff.length;
  for (let i = 0; i < len; ++i) {
    const arr = stuff[i];

    const arrLen = arr.length;
    if (!Array.isArray(arr) || arrLen < 2) {
      throw new TypeError('each array member must be [ee, events...]');
    }

    const ee = arr[0];
    for (let j = 1; j < arrLen; ++j) {
      const event = arr[j];
      const fn = listener(event, callback);

      // listen to the event
      ee.on(event, fn);
      // push this listener to the list of cleanups
      cleanups.push({
        ee: ee,
        event: event,
        fn: fn
      });
    }
  }

  function callback () {
    cleanup();
    done.apply(null, arguments);
  }

  function cleanup () {
    let x;
    const len = cleanups.length;
    for (let i = 0; i < len; ++i) {
      x = cleanups[i];
      x.ee.removeListener(x.event, x.fn);
    }
  }

  function thunk (fn) {
    done = fn;
  }

  thunk.cancel = cleanup;

  return thunk;
}

/**
 * Create the event listener.
 * @private
 */

function listener (event, done) {
  return function onevent (arg1) {
    const args = new Array(arguments.length);
    const ee = this;
    const err = event === 'error'
      ? arg1
      : null;

    // copy args to prevent arguments escaping scope
    const len = args.length;
    for (var i = 0; i < len; ++i) {
      args[i] = arguments[i];
    }

    done(err, ee, event, args);
  }
}
