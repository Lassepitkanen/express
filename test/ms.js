/* eslint-disable no-undef */
/**
 * Dependencies.
 */

import ms from '../lib/deps/ms/index.js';
import assert from 'assert';

// strings

describe('ms(string)', function() {
  it('should not throw an error', function() {
    assert.doesNotThrow(function() {
      ms('1m');
    });
  });

  it('should preserve ms', function() {
    assert.strictEqual(ms('100'), 100);
  });

  it('should convert from m to ms', function() {
    assert.strictEqual(ms('1m'), 60000);
  });

  it('should convert from h to ms', function() {
    assert.strictEqual(ms('1h'), 3600000);
  });

  it('should convert d to ms', function() {
    assert.strictEqual(ms('2d'), 172800000);
  });

  it('should convert w to ms', function() {
    assert.strictEqual(ms('3w'), 1814400000);
  });

  it('should convert s to ms', function() {
    assert.strictEqual(ms('1s'), 1000);
  });

  it('should convert ms to ms', function() {
    assert.strictEqual(ms('100ms'), 100);
  });

  it('should work with decimals', function() {
    assert.strictEqual(ms('1.5h'), 5400000);
  });

  it('should work with multiple spaces', function() {
    assert.strictEqual(ms('1   s'), 1000);
  });

  it('should return NaN if invalid', function() {
    assert.strictEqual(isNaN(ms('☃')), true);
    assert.strictEqual(isNaN(ms('10-.5')), true);
  });

  it('should be case-insensitive', function() {
    assert.strictEqual(ms('1.5H'), 5400000);
  });

  it('should work with numbers starting with .', function() {
    assert.strictEqual(ms('.5ms'), 0.5);
  });

  it('should work with negative integers', function() {
    assert.strictEqual(ms('-100ms'), -100);
  });

  it('should work with negative decimals', function() {
    assert.strictEqual(ms('-1.5h'), -5400000);
    assert.strictEqual(ms('-10.5h'), -37800000);
  });

  it('should work with negative decimals starting with "."', function() {
    assert.strictEqual(ms('-.5h'), -1800000);
  });
});

// long strings

describe('ms(long string)', function() {
  it('should not throw an error', function() {
    assert.doesNotThrow(function() {
      ms('53 milliseconds');
    });
  });

  it('should convert milliseconds to ms', function() {
    assert(ms('53 milliseconds'), 53);
  });

  it('should convert msecs to ms', function() {
    assert(ms('17 msecs'), 17);
  });

  it('should convert sec to ms', function() {
    assert(ms('1 sec'), 1000);
  });

  it('should convert from min to ms', function() {
    assert(ms('1 min'), 60000);
  });

  it('should convert from hr to ms', function() {
    assert(ms('1 hr'), 3600000);
  });

  it('should convert days to ms', function() {
    assert(ms('2 days'), 172800000);
  });

  it('should work with decimals', function() {
    assert(ms('1.5 hours'), 5400000);
  });

  it('should work with negative integers', function() {
    assert(ms('-100 milliseconds'), -100);
  });

  it('should work with negative decimals', function() {
    assert(ms('-1.5 hours'), -5400000);
  });

  it('should work with negative decimals starting with "."', function() {
    assert(ms('-.5 hr'), -1800000);
  });
});

// numbers

describe('ms(number, { long: true })', function() {
  it('should not throw an error', function() {
    assert.doesNotThrow(function() {
      ms(500, { long: true });
    });
  });

  it('should support milliseconds', function() {
    assert(ms(500, { long: true }), '500 ms');

    assert(ms(-500, { long: true }), '-500 ms');
  });

  it('should support seconds', function() {
    assert(ms(1000, { long: true }), '1 second');
    assert(ms(1200, { long: true }), '1 second');
    assert(ms(10000, { long: true }), '10 seconds');

    assert(ms(-1000, { long: true }), '-1 second');
    assert(ms(-1200, { long: true }), '-1 second');
    assert(ms(-10000, { long: true }), '-10 seconds');
  });

  it('should support minutes', function() {
    assert(ms(60 * 1000, { long: true }), '1 minute');
    assert(ms(60 * 1200, { long: true }), '1 minute');
    assert(ms(60 * 10000, { long: true }), '10 minutes');

    assert(ms(-1 * 60 * 1000, { long: true }), '-1 minute');
    assert(ms(-1 * 60 * 1200, { long: true }), '-1 minute');
    assert(ms(-1 * 60 * 10000, { long: true }), '-10 minutes');
  });

  it('should support hours', function() {
    assert(ms(60 * 60 * 1000, { long: true }), '1 hour');
    assert(ms(60 * 60 * 1200, { long: true }), '1 hour');
    assert(ms(60 * 60 * 10000, { long: true }), '10 hours');

    assert(ms(-1 * 60 * 60 * 1000, { long: true }), '-1 hour');
    assert(ms(-1 * 60 * 60 * 1200, { long: true }), '-1 hour');
    assert(ms(-1 * 60 * 60 * 10000, { long: true }), '-10 hours');
  });

  it('should support days', function() {
    assert(ms(24 * 60 * 60 * 1000, { long: true }), '1 day');
    assert(ms(24 * 60 * 60 * 1200, { long: true }), '1 day');
    assert(ms(24 * 60 * 60 * 10000, { long: true }), '10 days');

    assert(ms(-1 * 24 * 60 * 60 * 1000, { long: true }), '-1 day');
    assert(ms(-1 * 24 * 60 * 60 * 1200, { long: true }), '-1 day');
    assert(ms(-1 * 24 * 60 * 60 * 10000, { long: true }), '-10 days');
  });

  it('should round', function() {
    assert(ms(234234234, { long: true }), '3 days');

    assert(ms(-234234234, { long: true }), '-3 days');
  });
});

// numbers

describe('ms(number)', function() {
  it('should not throw an error', function() {
    assert.doesNotThrow(function() {
      ms(500);
    });
  });

  it('should support milliseconds', function() {
    assert(ms(500), '500ms');

    assert(ms(-500), '-500ms');
  });

  it('should support seconds', function() {
    assert(ms(1000), '1s');
    assert(ms(10000), '10s');

    assert(ms(-1000), '-1s');
    assert(ms(-10000), '-10s');
  });

  it('should support minutes', function() {
    assert(ms(60 * 1000), '1m');
    assert(ms(60 * 10000), '10m');

    assert(ms(-1 * 60 * 1000), '-1m');
    assert(ms(-1 * 60 * 10000), '-10m');
  });

  it('should support hours', function() {
    assert(ms(60 * 60 * 1000), '1h');
    assert(ms(60 * 60 * 10000), '10h');

    assert(ms(-1 * 60 * 60 * 1000), '-1h');
    assert(ms(-1 * 60 * 60 * 10000), '-10h');
  });

  it('should support days', function() {
    assert(ms(24 * 60 * 60 * 1000), '1d');
    assert(ms(24 * 60 * 60 * 10000), '10d');

    assert(ms(-1 * 24 * 60 * 60 * 1000), '-1d');
    assert(ms(-1 * 24 * 60 * 60 * 10000), '-10d');
  });

  it('should round', function() {
    assert(ms(234234234), '3d');

    assert(ms(-234234234), '-3d');
  });
});

// invalid inputs

describe('ms(invalid inputs)', function() {
  it('should throw an error, when ms("")', function() {
    assert.throws(function() {
      ms('');
    });
  });

  it('should throw an error, when ms(undefined)', function() {
    assert.throws(function() {
      ms(undefined);
    });
  });

  it('should throw an error, when ms(null)', function() {
    assert.throws(function() {
      ms(null);
    });
  });

  it('should throw an error, when ms([])', function() {
    assert.throws(function() {
      ms([]);
    });
  });

  it('should throw an error, when ms({})', function() {
    assert.throws(function() {
      ms({});
    });
  });

  it('should throw an error, when ms(NaN)', function() {
    assert.throws(function() {
      ms(NaN);
    });
  });

  it('should throw an error, when ms(Infinity)', function() {
    assert.throws(function() {
      ms(Infinity);
    });
  });

  it('should throw an error, when ms(-Infinity)', function() {
    assert.throws(function() {
      ms(-Infinity);
    });
  });
});
