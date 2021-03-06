
import assert from 'assert';
import * as http from 'http';
import * as net from 'net';
import { onFinished, isFinished } from '../lib/deps/on-finished/index.js';
import { EventEmitter } from 'events';
import { first } from '../lib/deps/on-finished/ee-first.js';


describe('first', function () {
  var ee1 = new EventEmitter()
  var ee2 = new EventEmitter()
  var ee3 = new EventEmitter()

  it('should require array argument', function () {
    assert.throws(first.bind())
    assert.throws(first.bind(null, 'string'))
    assert.throws(first.bind(null, 42))
    assert.throws(first.bind(null, {}))
  })

  it('should require array of arrays argument', function () {
    assert.throws(first.bind(null, [0]))
    assert.throws(first.bind(null, ['string']))
    assert.throws(first.bind(null, [[ee1], 'string']))
  })

  it('should emit the first event', function (done) {
    first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c']
    ], function (err, ee, event, args) {
      assert.ifError(err)
      assert.equal(ee, ee2)
      assert.equal(event, 'b')
      assert.deepEqual(args, [1, 2, 3])
      done()
    })

    ee2.emit('b', 1, 2, 3)
  })

  it('it should return an error if event === error', function (done) {
    first([
      [ee1, 'error', 'b', 'c'],
      [ee2, 'error', 'b', 'c'],
      [ee3, 'error', 'b', 'c']
    ], function (err, ee, event, args) {
      assert.equal(err.message, 'boom')
      assert.equal(ee, ee3)
      assert.equal(event, 'error')
      done()
    })

    ee3.emit('error', new Error('boom'))
  })

  it('should cleanup after itself', function (done) {
    first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c']
    ], function (err, ee, event, args) {
      assert.ifError(err)
      ;[ee1, ee2, ee3].forEach(function (ee) {
        ['a', 'b', 'c'].forEach(function (event) {
          assert(!ee.listeners(event).length)
        })
      })
      done()
    })

    ee1.emit('a')
  })

  it('should return a thunk', function (done) {
    var thunk = first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c']
    ])
    thunk(function (err, ee, event, args) {
      assert.ifError(err)
      assert.equal(ee, ee2)
      assert.equal(event, 'b')
      assert.deepEqual(args, [1, 2, 3])
      done()
    })

    ee2.emit('b', 1, 2, 3)
  })

  it('should not emit after thunk.cancel()', function (done) {
    var thunk = first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c']
    ])
    thunk(function () {
      assert.ok(false)
    })

    thunk.cancel()

    ee2.emit('b', 1, 2, 3)

    setTimeout(done, 10)
  })

  it('should cleanup after thunk.cancel()', function (done) {
    var thunk = first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c']
    ])

    thunk.cancel()

    ;[ee1, ee2, ee3].forEach(function (ee) {
      ['a', 'b', 'c'].forEach(function (event) {
        assert(!ee.listeners(event).length)
      })
    })
    done()
  })
})

describe('onFinished(res, listener)', function () {
  it('should invoke listener given an unknown object', function (done) {
    onFinished({}, done)
  })

  describe('when the response finishes', function () {
    it('should fire the callback', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(res, done)
        setTimeout(res.end.bind(res), 0)
      })

      sendGet(server)
    })

    it('should include the response object', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(res, function (err, msg) {
          assert.ok(!err)
          assert.strictEqual(msg, res)
          done()
        })
        setTimeout(res.end.bind(res), 0)
      })

      sendGet(server)
    })

    it('should fire when called after finish', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(res, function () {
          onFinished(res, done)
        })
        setTimeout(res.end.bind(res), 0)
      })

      sendGet(server)
    })
  })

  describe('when using keep-alive', function () {
    it('should fire for each response', function (done) {
      var called = false
      var server = http.createServer(function (req, res) {
        onFinished(res, function () {
          if (called) {
            socket.end()
            server.close()
            done(called !== req ? null : new Error('fired twice on same req'))
            return
          }

          called = req

          writeRequest(socket)
        })

        res.end()
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this)
        })
      })
    })
  })

  describe('when requests pipelined', function () {
    it('should fire for each request', function (done) {
      var count = 0
      var responses = []
      var server = http.createServer(function (req, res) {
        responses.push(res)

        onFinished(res, function (err) {
          assert.ifError(err)
          assert.strictEqual(responses[0], res)
          responses.shift()

          if (responses.length === 0) {
            socket.end()
            return
          }

          responses[0].end('response b')
        })

        onFinished(req, function (err) {
          assert.ifError(err)

          if (++count !== 2) {
            return
          }

          assert.strictEqual(responses.length, 2)
          responses[0].end('response a')
        })

        if (responses.length === 1) {
          // second request
          writeRequest(socket)
        }

        req.resume()
      })
      var socket

      server.listen(function () {
        var data = ''
        socket = net.connect(this.address().port, function () {
          writeRequest(this)
        })

        socket.on('data', function (chunk) {
          data += chunk.toString('binary')
        })
        socket.on('end', function () {
          assert.ok(/response a/.test(data))
          assert.ok(/response b/.test(data))
          server.close(done)
        })
      })
    })
  })

  describe('when response errors', function () {
    it('should fire with error', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(res, function (err) {
          assert.ok(err)
          server.close(done)
        })

        socket.on('error', noop)
        socket.write('W')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })

    it('should include the response object', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(res, function (err, msg) {
          assert.ok(err)
          assert.strictEqual(msg, res)
          server.close(done)
        })

        socket.on('error', noop)
        socket.write('W')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })
  })

  describe('when the response aborts', function () {
    it('should execute the callback', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        onFinished(res, close(server, done))
        setTimeout(client.abort.bind(client), 0)
      })
      server.listen(function () {
        var port = this.address().port
        client = http.get('http://127.0.0.1:' + port)
        client.on('error', noop)
      })
    })
  })

  describe('when calling many times on same response', function () {
    it('should not print warnings', function (done) {
      var server = http.createServer(function (req, res) {
        var stderr = captureStderr(function () {
          for (var i = 0; i < 400; i++) {
            onFinished(res, noop)
          }
        })

        onFinished(res, done)
        assert.strictEqual(stderr, '')
        res.end()
      })

      server.listen(function () {
        var port = this.address().port
        http.get('http://127.0.0.1:' + port, function (res) {
          res.resume()
          res.on('end', server.close.bind(server))
        })
      })
    })
  })
})

describe('isFinished(res)', function () {
  it('should return undefined for unknown object', function () {
    assert.strictEqual(isFinished({}), undefined)
  })

  it('should be false before response finishes', function (done) {
    var server = http.createServer(function (req, res) {
      assert.ok(!isFinished(res))
      res.end()
      done()
    })

    sendGet(server)
  })

  it('should be true after response finishes', function (done) {
    var server = http.createServer(function (req, res) {
      onFinished(res, function (err) {
        assert.ifError(err)
        assert.ok(isFinished(res))
        done()
      })

      res.end()
    })

    sendGet(server)
  })

  describe('when requests pipelined', function () {
    it('should have correct state when socket shared', function (done) {
      var count = 0
      var responses = []
      var server = http.createServer(function (req, res) {
        responses.push(res)

        onFinished(req, function (err) {
          assert.ifError(err)

          if (++count !== 2) {
            return
          }

          assert.ok(!isFinished(responses[0]))
          assert.ok(!isFinished(responses[1]))

          responses[0].end()
          responses[1].end()
          socket.end()
          server.close(done)
        })

        if (responses.length === 1) {
          // second request
          writeRequest(socket)
        }

        req.resume()
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this)
        })
      })
    })

    it('should handle aborted requests', function (done) {
      var count = 0
      var requests = 0
      var server = http.createServer(function (req, res) {
        requests++

        onFinished(req, function (err) {
          switch (++count) {
            case 1:
              assert.ifError(err)
              // abort the socket
              socket.on('error', noop)
              socket.destroy()
              break
            case 2:
              server.close(done)
              break
          }
        })

        req.resume()

        if (requests === 1) {
          // second request
          writeRequest(socket, true)
        }
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this)
        })
      })
    })
  })

  describe('when response errors', function () {
    it('should return true', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(res, function (err) {
          assert.ok(err)
          assert.ok(isFinished(res))
          server.close(done)
        })

        socket.on('error', noop)
        socket.write('W')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })
  })

  describe('when the response aborts', function () {
    it('should return true', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        onFinished(res, function (err) {
          assert.ifError(err)
          assert.ok(isFinished(res))
          server.close(done)
        })
        setTimeout(client.abort.bind(client), 0)
      })
      server.listen(function () {
        var port = this.address().port
        client = http.get('http://127.0.0.1:' + port)
        client.on('error', noop)
      })
    })
  })
})

describe('onFinished(req, listener)', function () {
  describe('when the request finishes', function () {
    it('should fire the callback', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(req, done)
        req.resume()
        setTimeout(res.end.bind(res), 0)
      })

      sendGet(server)
    })

    it('should include the request object', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(req, function (err, msg) {
          assert.ok(!err)
          assert.strictEqual(msg, req)
          done()
        })
        req.resume()
        setTimeout(res.end.bind(res), 0)
      })

      sendGet(server)
    })

    it('should fire when called after finish', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(req, function () {
          onFinished(req, done)
        })
        req.resume()
        setTimeout(res.end.bind(res), 0)
      })

      sendGet(server)
    })
  })

  describe('when using keep-alive', function () {
    it('should fire for each request', function (done) {
      var called = false
      var server = http.createServer(function (req, res) {
        var data = ''

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.strictEqual(data, 'A')

          if (called) {
            socket.end()
            server.close()
            done(called !== req ? null : new Error('fired twice on same req'))
            return
          }

          called = req

          res.end()
          writeRequest(socket, true)
        })

        req.setEncoding('utf8')
        req.on('data', function (str) {
          data += str
        })

        socket.write('1\r\nA\r\n')
        socket.write('0\r\n\r\n')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })
  })

  describe('when request errors', function () {
    it('should fire with error', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(req, function (err) {
          assert.ok(err)
          server.close(done)
        })

        socket.on('error', noop)
        socket.write('W')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })

    it('should include the request object', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(req, function (err, msg) {
          assert.ok(err)
          assert.strictEqual(msg, req)
          server.close(done)
        })

        socket.on('error', noop)
        socket.write('W')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })
  })

  describe('when requests pipelined', function () {
    it('should handle socket errors', function (done) {
      var count = 0
      var server = http.createServer(function (req) {
        var num = ++count

        onFinished(req, function (err) {
          assert.ok(err)
          if (!--wait) server.close(done)
        })

        if (num === 1) {
          // second request
          writeRequest(socket, true)
          req.pause()
        } else {
          // cause framing error in second request
          socket.write('W')
          req.resume()
        }
      })
      var socket
      var wait = 3

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this)
        })

        socket.on('close', function () {
          assert.strictEqual(count, 2)
          if (!--wait) server.close(done)
        })

        socket.resume()
      })
    })
  })

  describe('when the request aborts', function () {
    it('should execute the callback', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        onFinished(req, close(server, done))
        setTimeout(client.abort.bind(client), 0)
      })
      server.listen(function () {
        var port = this.address().port
        client = http.get('http://127.0.0.1:' + port)
        client.on('error', noop)
      })
    })
  })

  describe('when calling many times on same request', function () {
    it('should not print warnings', function (done) {
      var server = http.createServer(function (req, res) {
        var stderr = captureStderr(function () {
          for (var i = 0; i < 400; i++) {
            onFinished(req, noop)
          }
        })

        onFinished(req, done)
        assert.strictEqual(stderr, '')
        res.end()
      })

      server.listen(function () {
        var port = this.address().port
        http.get('http://127.0.0.1:' + port, function (res) {
          res.resume()
          res.on('end', server.close.bind(server))
        })
      })
    })
  })

  describe('when CONNECT method', function () {
    it('should fire when request finishes', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })
      server.on('connect', function (req, socket, bodyHead) {
        var data = [bodyHead]

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.strictEqual(Buffer.concat(data).toString(), 'knock, knock')

          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'ping')
            socket.end('pong')
          })
          socket.write('HTTP/1.1 200 OK\r\n\r\n')
        })

        req.on('data', function (chunk) {
          data.push(chunk)
        })
      })

      server.listen(function () {
        client = http.request({
          hostname: '127.0.0.1',
          method: 'CONNECT',
          path: '127.0.0.1:80',
          port: this.address().port
        })
        client.on('connect', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end('knock, knock')
      })
    })

    it('should fire when called after finish', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })
      server.on('connect', function (req, socket, bodyHead) {
        var data = [bodyHead]

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.strictEqual(Buffer.concat(data).toString(), 'knock, knock')
          socket.write('HTTP/1.1 200 OK\r\n\r\n')
        })

        socket.on('data', function (chunk) {
          assert.strictEqual(chunk.toString(), 'ping')
          onFinished(req, function () {
            socket.end('pong')
          })
        })

        req.on('data', function (chunk) {
          data.push(chunk)
        })
      })

      server.listen(function () {
        client = http.request({
          hostname: '127.0.0.1',
          method: 'CONNECT',
          path: '127.0.0.1:80',
          port: this.address().port
        })
        client.on('connect', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end('knock, knock')
      })
    })
  })

  describe('when Upgrade request', function () {
    it('should fire when request finishes', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })
      server.on('upgrade', function (req, socket, bodyHead) {
        var data = [bodyHead]

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.strictEqual(Buffer.concat(data).toString(), 'knock, knock')

          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'ping')
            socket.end('pong')
          })
          socket.write('HTTP/1.1 101 Switching Protocols\r\n')
          socket.write('Connection: Upgrade\r\n')
          socket.write('Upgrade: Raw\r\n')
          socket.write('\r\n')
        })

        req.on('data', function (chunk) {
          data.push(chunk)
        })
      })

      server.listen(function () {
        client = http.request({
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'Raw'
          },
          hostname: '127.0.0.1',
          port: this.address().port
        })

        client.on('upgrade', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end('knock, knock')
      })
    })

    it('should fire when called after finish', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })
      server.on('upgrade', function (req, socket, bodyHead) {
        var data = [bodyHead]

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.strictEqual(Buffer.concat(data).toString(), 'knock, knock')

          socket.write('HTTP/1.1 101 Switching Protocols\r\n')
          socket.write('Connection: Upgrade\r\n')
          socket.write('Upgrade: Raw\r\n')
          socket.write('\r\n')
        })

        socket.on('data', function (chunk) {
          assert.strictEqual(chunk.toString(), 'ping')
          onFinished(req, function () {
            socket.end('pong')
          })
        })

        req.on('data', function (chunk) {
          data.push(chunk)
        })
      })

      server.listen(function () {
        client = http.request({
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'Raw'
          },
          hostname: '127.0.0.1',
          port: this.address().port
        })

        client.on('upgrade', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end('knock, knock')
      })
    })
  })
})

describe('isFinished(req)', function () {
  it('should return undefined for unknown object', function () {
    assert.strictEqual(isFinished({}), undefined)
  })

  it('should be false before request finishes', function (done) {
    var server = http.createServer(function (req, res) {
      assert.ok(!isFinished(req))
      req.resume()
      res.end()
      done()
    })

    sendGet(server)
  })

  it('should be true after request finishes', function (done) {
    var server = http.createServer(function (req, res) {
      onFinished(req, function (err) {
        assert.ifError(err)
        assert.ok(isFinished(req))
        done()
      })

      req.resume()
      res.end()
    })

    sendGet(server)
  })

  describe('when request data buffered', function () {
    it('should be false before request finishes', function (done) {
      var server = http.createServer(function (req, res) {
        assert.ok(!isFinished(req))

        req.pause()
        setTimeout(function () {
          assert.ok(!isFinished(req))
          req.resume()
          res.end()
          done()
        }, 10)
      })

      sendGet(server)
    })
  })

  describe('when request errors', function () {
    it('should return true', function (done) {
      var server = http.createServer(function (req, res) {
        onFinished(req, function (err) {
          assert.ok(err)
          assert.ok(isFinished(req))
          server.close(done)
        })

        socket.on('error', noop)
        socket.write('W')
      })
      var socket

      server.listen(function () {
        socket = net.connect(this.address().port, function () {
          writeRequest(this, true)
        })
      })
    })
  })

  describe('when the request aborts', function () {
    it('should return true', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        onFinished(res, function (err) {
          assert.ifError(err)
          assert.ok(isFinished(req))
          server.close(done)
        })
        setTimeout(client.abort.bind(client), 0)
      })
      server.listen(function () {
        var port = this.address().port
        client = http.get('http://127.0.0.1:' + port)
        client.on('error', noop)
      })
    })
  })

  describe('when CONNECT method', function () {
    it('should be true immediately', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })

      server.on('connect', function (req, socket, bodyHead) {
        assert.ok(isFinished(req))
        assert.strictEqual(bodyHead.length, 0)
        req.resume()

        socket.on('data', function (chunk) {
          assert.strictEqual(chunk.toString(), 'ping')
          socket.end('pong')
        })
        socket.write('HTTP/1.1 200 OK\r\n\r\n')
      })

      server.listen(function () {
        client = http.request({
          hostname: '127.0.0.1',
          method: 'CONNECT',
          path: '127.0.0.1:80',
          port: this.address().port
        })

        client.on('connect', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end()
      })
    })

    it('should be true after request finishes', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })
      server.on('connect', function (req, socket, bodyHead) {
        var data = [bodyHead]

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.ok(isFinished(req))
          assert.strictEqual(Buffer.concat(data).toString(), 'knock, knock')
          socket.write('HTTP/1.1 200 OK\r\n\r\n')
        })

        socket.on('data', function (chunk) {
          assert.strictEqual(chunk.toString(), 'ping')
          socket.end('pong')
        })

        req.on('data', function (chunk) {
          data.push(chunk)
        })
      })

      server.listen(function () {
        client = http.request({
          hostname: '127.0.0.1',
          method: 'CONNECT',
          path: '127.0.0.1:80',
          port: this.address().port
        })
        client.on('connect', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end('knock, knock')
      })
    })
  })

  describe('when Upgrade request', function () {
    it('should be true immediately', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })

      server.on('upgrade', function (req, socket, bodyHead) {
        assert.ok(isFinished(req))
        assert.strictEqual(bodyHead.length, 0)
        req.resume()

        socket.on('data', function (chunk) {
          assert.strictEqual(chunk.toString(), 'ping')
          socket.end('pong')
        })
        socket.write('HTTP/1.1 101 Switching Protocols\r\n')
        socket.write('Connection: Upgrade\r\n')
        socket.write('Upgrade: Raw\r\n')
        socket.write('\r\n')
      })

      server.listen(function () {
        client = http.request({
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'Raw'
          },
          hostname: '127.0.0.1',
          port: this.address().port
        })

        client.on('upgrade', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end()
      })
    })

    it('should be true after request finishes', function (done) {
      var client
      var server = http.createServer(function (req, res) {
        res.statusCode = 405
        res.end()
      })
      server.on('upgrade', function (req, socket, bodyHead) {
        var data = [bodyHead]

        onFinished(req, function (err) {
          assert.ifError(err)
          assert.ok(isFinished(req))
          assert.strictEqual(Buffer.concat(data).toString(), 'knock, knock')

          socket.write('HTTP/1.1 101 Switching Protocols\r\n')
          socket.write('Connection: Upgrade\r\n')
          socket.write('Upgrade: Raw\r\n')
          socket.write('\r\n')
        })

        socket.on('data', function (chunk) {
          assert.strictEqual(chunk.toString(), 'ping')
          socket.end('pong')
        })

        req.on('data', function (chunk) {
          data.push(chunk)
        })
      })

      server.listen(function () {
        client = http.request({
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'Raw'
          },
          hostname: '127.0.0.1',
          port: this.address().port
        })

        client.on('upgrade', function (res, socket, bodyHead) {
          socket.write('ping')
          socket.on('data', function (chunk) {
            assert.strictEqual(chunk.toString(), 'pong')
            socket.end()
            server.close(done)
          })
        })
        client.end('knock, knock')
      })
    })
  })
})

function captureStderr (fn) {
  var chunks = []
  var write = process.stderr.write

  process.stderr.write = function write (chunk, encoding) {
    chunks.push(new Buffer(chunk, encoding)) // eslint-disable-line node/no-deprecated-api
  }

  try {
    fn()
  } finally {
    process.stderr.write = write
  }

  return Buffer.concat(chunks).toString('utf8')
}

function close (server, callback) {
  return function (error) {
    server.close(function (err) {
      callback(error || err)
    })
  }
}

function noop () {}

function sendGet (server) {
  server.listen(function onListening () {
    var port = this.address().port
    http.get('http://127.0.0.1:' + port, function onResponse (res) {
      res.resume()
      res.on('end', server.close.bind(server))
    })
  })
}

function writeRequest (socket, chunked) {
  socket.write('GET / HTTP/1.1\r\n')
  socket.write('Host: localhost\r\n')
  socket.write('Connection: keep-alive\r\n')

  if (chunked) {
    socket.write('Transfer-Encoding: chunked\r\n')
  }

  socket.write('\r\n')
}
