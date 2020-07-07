'use strict';

import { format } from '../lib/deps/bytes/index.js';
import assert from 'assert';

describe('Test byte format function', function(){
  var pb = Math.pow(1024, 5);
  var tb = (1 << 30) * 1024,
    gb = 1 << 30,
    mb = 1 << 20,
    kb = 1 << 10;

  it('Should return null if input is invalid', function(){
    assert.strictEqual(format(undefined), null);
    assert.strictEqual(format(null), null);
    assert.strictEqual(format(true), null);
    assert.strictEqual(format(false), null);
    assert.strictEqual(format(NaN), null);
    assert.strictEqual(format(Infinity), null);
    assert.strictEqual(format(''), null);
    assert.strictEqual(format('string'), null);
    assert.strictEqual(format(function(){}), null);
    assert.strictEqual(format({}), null);
  });

  it('Should convert numbers < 1024 to `bytes` string', function(){
    assert.equal(format(0).toLowerCase(), '0b');
    assert.equal(format(100).toLowerCase(), '100b');
    assert.equal(format(-100).toLowerCase(), '-100b');
  });

  it('Should convert numbers >= 1 024 to kb string', function(){
    assert.equal(format(kb).toLowerCase(), '1kb');
    assert.equal(format(-kb).toLowerCase(), '-1kb');
    assert.equal(format(2 * kb).toLowerCase(), '2kb');
  });

  it('Should convert numbers >= 1 048 576 to mb string', function(){
    assert.equal(format(mb).toLowerCase(), '1mb');
    assert.equal(format(-mb).toLowerCase(), '-1mb');
    assert.equal(format(2 * mb).toLowerCase(), '2mb');
  });

  it('Should convert numbers >= (1 << 30) to gb string', function(){
    assert.equal(format(gb).toLowerCase(), '1gb');
    assert.equal(format(-gb).toLowerCase(), '-1gb');
    assert.equal(format(2 * gb).toLowerCase(), '2gb');
  });

  it('Should convert numbers >= ((1 << 30) * 1024) to tb string', function(){
    assert.equal(format(tb).toLowerCase(), '1tb');
    assert.equal(format(-tb).toLowerCase(), '-1tb');
    assert.equal(format(2 * tb).toLowerCase(), '2tb');
  });

  it('Should convert numbers >= 1 125 899 906 842 624 to pb string', function(){
    assert.equal(format(pb).toLowerCase(), '1pb');
    assert.equal(format(-pb).toLowerCase(), '-1pb');
    assert.equal(format(2 * pb).toLowerCase(), '2pb');
  });

  it('Should return standard case', function(){
    assert.equal(format(10), '10B');
    assert.equal(format(kb), '1KB');
    assert.equal(format(mb), '1MB');
    assert.equal(format(gb), '1GB');
    assert.equal(format(tb), '1TB');
    assert.equal(format(pb), '1PB');
  });

  it('Should support custom thousands separator', function(){
    assert.equal(format(1000).toLowerCase(), '1000b');
    assert.equal(format(1000, {thousandsSeparator: ''}).toLowerCase(), '1000b');
    assert.equal(format(1000, {thousandsSeparator: null}).toLowerCase(), '1000b');
    assert.equal(format(1000, {thousandsSeparator: '.'}).toLowerCase(), '1.000b');
    assert.equal(format(1000, {thousandsSeparator: ','}).toLowerCase(), '1,000b');
    assert.equal(format(1000, {thousandsSeparator: ' '}).toLowerCase(), '1 000b');
  });

  it('Should support custom unit separator', function(){
    assert.equal(format(1024), '1KB');
    assert.equal(format(1024, {unitSeparator: ''}), '1KB');
    assert.equal(format(1024, {unitSeparator: null}), '1KB');
    assert.equal(format(1024, {unitSeparator: ' '}), '1 KB');
    assert.equal(format(1024, {unitSeparator: '\t'}), '1\tKB');
  });

  it('Should support custom number of decimal places', function(){
    assert.equal(format(kb - 1, {decimalPlaces: 0}).toLowerCase(), '1023b');
    assert.equal(format(kb, {decimalPlaces: 0}).toLowerCase(), '1kb');
    assert.equal(format(1.4 * kb, {decimalPlaces: 0}).toLowerCase(), '1kb');
    assert.equal(format(1.5 * kb, {decimalPlaces: 0}).toLowerCase(), '2kb');
    assert.equal(format(kb - 1, {decimalPlaces: 1}).toLowerCase(), '1023b');
    assert.equal(format(kb, {decimalPlaces: 1}).toLowerCase(), '1kb');
    assert.equal(format(1.04 * kb, {decimalPlaces: 1}).toLowerCase(), '1kb');
    assert.equal(format(1.05 * kb, {decimalPlaces: 1}).toLowerCase(), '1.1kb');
  });

  it('Should support fixed decimal places', function(){
    assert.equal(format(kb, {decimalPlaces: 3, fixedDecimals: true}).toLowerCase(), '1.000kb');
  });

  it('Should support floats', function(){
    assert.equal(format(1.2 * mb).toLowerCase(), '1.2mb');
    assert.equal(format(-1.2 * mb).toLowerCase(), '-1.2mb');
    assert.equal(format(1.2 * kb).toLowerCase(), '1.2kb');
  })

  it('Should support custom unit', function(){
    assert.equal(format(12 * mb, {unit: 'b'}).toLowerCase(), '12582912b');
    assert.equal(format(12 * mb, {unit: 'kb'}).toLowerCase(), '12288kb');
    assert.equal(format(12 * gb, {unit: 'mb'}).toLowerCase(), '12288mb');
    assert.equal(format(12 * tb, {unit: 'gb'}).toLowerCase(), '12288gb');
    assert.equal(format(12 * mb, {unit: ''}).toLowerCase(), '12mb');
    assert.equal(format(12 * mb, {unit: 'bb'}).toLowerCase(), '12mb');
  })
});
