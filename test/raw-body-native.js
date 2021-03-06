var assert = require('assert')
var Buffer = require('safe-buffer').Buffer
import getRawBody from '../lib/deps/raw-body/index.js';
var Readable = require('stream').Readable
var run = Readable ? describe : describe.skip

run('using native streams', function () {
  it('should read contents', function (done) {
    var stream = createStream(Buffer.from('hello, streams!'))

    getRawBody(stream, function (err, buf) {
      assert.ifError(err)
      assert.strictEqual(buf.toString(), 'hello, streams!')
      done()
    })
  })

  it('should read pre-buffered contents', function (done) {
    var stream = createStream(Buffer.from('hello, streams!'))
    stream.push('oh, ')

    getRawBody(stream, function (err, buf) {
      assert.ifError(err)
      assert.strictEqual(buf.toString(), 'oh, hello, streams!')
      done()
    })
  })

  it('should stop the stream on limit', function (done) {
    var stream = createStream(Buffer.from('hello, streams!'))

    getRawBody(stream, { limit: 2 }, function (err, buf) {
      assert.ok(err)
      assert.strictEqual(err.status, 413)
      assert.strictEqual(err.limit, 2)
      process.nextTick(done)
    })
  })
})

function createStream (buf) {
  var stream = new Readable()
  stream._read = function () {
    stream.push(buf)
    stream.push(null)
  }

  return stream
}
