/**
 * Usage: node test.js
 */

import assert from 'assert';
import { mime } from '../lib/deps/mime/index.js';

//
// Test mime lookups
//
describe('mime - lookup', function() {
  it('normal file', function() {
    assert.equal('text/plain', mime.lookup('text.txt'));
  })

  it('uppercase', function() {
    assert.equal('text/plain', mime.lookup('TEXT.TXT'));
  })

  it('dir + file', function() {
    assert.equal('text/plain', mime.lookup('dir/text.txt'));
  })

  it('hidden file', function() {
    assert.equal('text/plain', mime.lookup('.text.txt'));
  })

  it('nameless', function() {
    assert.equal('text/plain', mime.lookup('.txt'));
  })

  it('extension-only', function() {
    assert.equal('text/plain', mime.lookup('txt'));
  })

  it('extension-less ()', function() {
    assert.equal('text/plain', mime.lookup('/txt'));
  })

  it('Windows, extension-less', function() {
    assert.equal('text/plain', mime.lookup('\\txt'));
  })

  it('unrecognized', function() {
    assert.equal('application/octet-stream', mime.lookup('text.nope'));
  })

  it('alternate default', function() {
    assert.equal('fallback', mime.lookup('text.fallback', 'fallback'));
  })
});


describe('mime - extensions', function() {
  it('extensions', function() {
    assert.equal('txt', mime.extension(mime.types.text));
    assert.equal('html', mime.extension(mime.types.htm));
    assert.equal('bin', mime.extension('application/octet-stream'));
    assert.equal('bin', mime.extension('application/octet-stream '));
    assert.equal('html', mime.extension(' text/html; charset=UTF-8'));
    assert.equal('html', mime.extension('text/html; charset=UTF-8 '));
    assert.equal('html', mime.extension('text/html; charset=UTF-8'));
    assert.equal('html', mime.extension('text/html ; charset=UTF-8'));
    assert.equal('html', mime.extension('text/html;charset=UTF-8'));
    assert.equal('html', mime.extension('text/Html;charset=UTF-8'));
    assert.equal(undefined, mime.extension('unrecognized'));
  })
});


//
// Test node.types lookups
//
describe('mime - lookups', function() {
  it('lookups', function() {
    assert.equal('font/woff', mime.lookup('file.woff'));
    assert.equal('application/octet-stream', mime.lookup('file.buffer'));
    // TODO: Uncomment once #157 is resolved
    // assert.equal('audio/mp4', mime.lookup('file.m4a'));
    assert.equal('font/otf', mime.lookup('file.otf'));
  })
});


//
// Test charsets
//
describe('mime - charsets', function() {
  it('charsets', function() {
    assert.equal('UTF-8', mime.charsets.lookup('text/plain'));
    assert.equal('UTF-8', mime.charsets.lookup(mime.types.js));
    assert.equal('UTF-8', mime.charsets.lookup(mime.types.json));
    assert.equal(undefined, mime.charsets.lookup(mime.types.bin));
    assert.equal('fallback', mime.charsets.lookup('application/octet-stream', 'fallback'));
  })
});


