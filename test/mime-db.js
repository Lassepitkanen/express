
import assert from 'assert';
import db from '../lib/deps/mime-db/index.js';

describe('mime-db', function () {
  it('should all be mime types', function () {
    assert(Object.keys(db).every(function (name) {
      return ~name.indexOf('/') || console.log(name)
    }))
  })

  it('should not have any uppercased letters in names', function () {
    Object.keys(db).forEach(function (name) {
      assert.strictEqual(name, name.toLowerCase(), 'type "' + name + '" should be lowercase')
    })
  })

  it('should have .json and .js as having UTF-8 charsets', function () {
    assert.strictEqual('UTF-8', db['application/json'].charset)
    assert.strictEqual('UTF-8', db['application/javascript'].charset)
  })

  it('should set audio/x-flac with extension=flac', function () {
    assert.strictEqual('flac', db['audio/x-flac'].extensions[0])
  })

  it('should have guessed application/mathml+xml', function () {
    // because it doesn't have a "template"
    assert(db['application/mathml+xml'])
  })

  it('should not have an empty .extensions', function () {
    assert(Object.keys(db).every(function (name) {
      var mime = db[name]
      if (!mime.extensions) return true
      return mime.extensions.length
    }))
  })

  it('should have the default .extension as the first', function () {
    assert.strictEqual(db['text/plain'].extensions[0], 'txt')
    assert.strictEqual(db['video/x-matroska'].extensions[0], 'mkv')
  })
})
