import assert from 'assert';
import { Buffer } from 'buffer';
import * as fs from 'fs';
import seedrandom from 'seedrandom';
import { etag } from '../lib/deps/etag/index.js';

const buf5kb = getbuffer(5 * 1024);
const str5kb = getbuffer(5 * 1024).toString();

describe('etag(entity)', function () {
  it('should require an entity', function () {
    assert.throws(etag.bind(), /argument entity is required/)
  })

  it('should reject number entities', function () {
    assert.throws(etag.bind(null, 4), /argument entity must be/)
  })

  describe('when "entity" is a string', function () {
    it('should generate a strong ETag', function () {
      assert.strictEqual(etag('beep boop'), '"9-fINXV39R1PCo05OqGqr7KIY9lCE"')
    })

    it('should work containing Unicode', function () {
      assert.strictEqual(etag('论'), '"3-QkSKq8sXBjHL2tFAZknA2n6LYzM"')
      assert.strictEqual(etag('论', { weak: true }), 'W/"3-QkSKq8sXBjHL2tFAZknA2n6LYzM"')
    })

    it('should work for empty string', function () {
      assert.strictEqual(etag(''), '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
    })
  })

  describe('when "entity" is a Buffer', function () {
    it('should generate a strong ETag', function () {
      assert.strictEqual(etag(Buffer.from([1, 2, 3])), '"3-cDeAcZjCKn0rCAc3HXY3eahP388"')
    })

    it('should work for empty Buffer', function () {
      assert.strictEqual(etag(Buffer.alloc(0)), '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
    })
  })

  describe('when "entity" is a fs.Stats', function () {
    it('should generate a weak ETag', function () {
      assert.ok(isweak(etag(fs.statSync(__filename))))
    })

    it('should generate consistently', function () {
      assert.strictEqual(etag(fs.statSync(__filename)), etag(fs.statSync(__filename)))
    })
  })

  describe('when "entity" looks like a stats object', function () {
    it('should generate a weak ETag', function () {
      var fakeStat = {
        ctime: new Date('2014-09-01T14:52:07Z'),
        mtime: new Date('2014-09-01T14:52:07Z'),
        ino: 0,
        size: 3027
      }
      assert.strictEqual(etag(fakeStat), 'W/"bd3-14831b399d8"')
    })
  })

  describe('with "weak" option', function () {
    describe('when "false"', function () {
      it('should generate a strong ETag for a string', function () {
        assert.strictEqual(etag('', { weak: false }), '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
        assert.strictEqual(etag('beep boop', { weak: false }), '"9-fINXV39R1PCo05OqGqr7KIY9lCE"')
        assert.strictEqual(etag(str5kb, { weak: false }), '"1400-CH0oWYLQGHe/yDhUrMkMg3fIdVU"')
      })

      it('should generate a strong ETag for a Buffer', function () {
        assert.strictEqual(etag(Buffer.alloc(0), { weak: false }), '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
        assert.strictEqual(etag(Buffer.from([1, 2, 3]), { weak: false }), '"3-cDeAcZjCKn0rCAc3HXY3eahP388"')
        assert.strictEqual(etag(buf5kb, { weak: false }), '"1400-CH0oWYLQGHe/yDhUrMkMg3fIdVU"')
      })

      it('should generate a strong ETag for fs.Stats', function () {
        assert.ok(!isweak(etag(fs.statSync(__filename), { weak: false })))
      })
    })

    describe('when "true"', function () {
      it('should generate a weak ETag for a string', function () {
        assert.strictEqual(etag('', { weak: true }), 'W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
        assert.strictEqual(etag('beep boop', { weak: true }), 'W/"9-fINXV39R1PCo05OqGqr7KIY9lCE"')
        assert.strictEqual(etag(str5kb, { weak: true }), 'W/"1400-CH0oWYLQGHe/yDhUrMkMg3fIdVU"')
      })

      it('should generate a weak ETag for a Buffer', function () {
        assert.strictEqual(etag(Buffer.alloc(0), { weak: true }), 'W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"')
        assert.strictEqual(etag(Buffer.from([1, 2, 3]), { weak: true }), 'W/"3-cDeAcZjCKn0rCAc3HXY3eahP388"')
        assert.strictEqual(etag(buf5kb, { weak: true }), 'W/"1400-CH0oWYLQGHe/yDhUrMkMg3fIdVU"')
      })

      it('should generate a weak ETag for fs.Stats', function () {
        assert.ok(isweak(etag(fs.statSync(__filename), { weak: true })))
      })

      it('should generate different ETags for different strings', function () {
        assert.notStrictEqual(etag('plumless', { weak: true }), etag('buckeroo', { weak: true }))
      })
    })
  })
})

function getbuffer (size) {
  var buffer = Buffer.alloc(size)
  var rng = seedrandom('etag test')

  for (var i = 0; i < buffer.length; i++) {
    buffer[i] = (rng() * 94 + 32) | 0
  }

  return buffer
}

function isweak (etag) {
  var weak = /^(W\/|)"([^"]+)"/.exec(etag)

  if (weak === null) {
    throw new Error('invalid ETag: ' + etag)
  }

  return weak[1] === 'W/'
}
