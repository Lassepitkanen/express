
/**
 * Module dependencies.
 * @private
 */

var assert = require('assert');
var Buffer = require('safe-buffer').Buffer

/**
 * Module exports.
 * @public
 */

exports.shouldHaveBody = shouldHaveBody
exports.shouldNotHaveBody = shouldNotHaveBody
exports.shouldNotHaveHeader = shouldNotHaveHeader;

/**
 * Assert that a supertest response has a specific body.
 *
 * @param {Buffer} buf
 * @returns {function}
 */

function shouldHaveBody (buf) {
  return function (res) {
    var body = !Buffer.isBuffer(res.body)
      ? Buffer.from(res.text)
      : res.body
    assert.ok(body, 'response has body')
    assert.strictEqual(body.toString('hex'), buf.toString('hex'))
  }
}

/**
 * Assert that a supertest response does not have a body.
 *
 * @returns {function}
 */

function shouldNotHaveBody () {
  return function (res) {
    assert.ok(res.text === '' || res.text === undefined)
  }
}

/**
 * Assert that a supertest response does not have a header.
 *
 * @param {string} header Header name to check
 * @returns {function}
 */
function shouldNotHaveHeader(header) {
  return function (res) {
    assert.ok(!(header.toLowerCase() in res.headers), 'should not have header ' + header);
  };
}












var assert = require('assert')
import finalhandler from '../../lib/deps/finalhandler/index.js';
var http = require('http')
var request = require('supertest')
import SlowWriteStream from './sws.js';

exports.assert = assert
exports.createError = createError
exports.createServer = createServer
exports.createSlowWriteStream = createSlowWriteStream
exports.rawrequest = rawrequest
exports.request = request
exports.shouldHaveStatusMessage = shouldHaveStatusMessage


function createError (message, props) {
  var err = new Error(message)

  if (props) {
    for (var prop in props) {
      err[prop] = props[prop]
    }
  }

  return err
}

function createServer (err, opts) {
  return http.createServer(function (req, res) {
    var done = finalhandler(req, res, opts)

    if (typeof err === 'function') {
      err(req, res, done)
      return
    }

    done(err)
  })
}

function createSlowWriteStream () {
  return new SlowWriteStream()
}

function rawrequest (server) {
  var _headers = {}
  var _path

  function expect (status, body, callback) {
    if (arguments.length === 2) {
      _headers[status.toLowerCase()] = body
      return this
    }

    server.listen(function onlisten () {
      var addr = this.address()
      var port = addr.port

      var req = http.get({
        host: '127.0.0.1',
        path: _path,
        port: port
      })
      req.on('error', callback)
      req.on('response', function onresponse (res) {
        var buf = ''

        res.setEncoding('utf8')
        res.on('data', function ondata (s) { buf += s })
        res.on('end', function onend () {
          var err = null

          try {
            for (var key in _headers) {
              assert.strictEqual(res.headers[key], _headers[key])
            }

            assert.strictEqual(res.statusCode, status)

            if (body instanceof RegExp) {
              assert.ok(body.test(buf), 'expected body ' + buf + ' to match ' + body)
            } else {
              assert.strictEqual(buf, body, 'expected ' + body + ' response body, got ' + buf)
            }
          } catch (e) {
            err = e
          }

          server.close()
          callback(err)
        })
      })
    })
  }

  function get (path) {
    _path = path

    return {
      expect: expect
    }
  }

  return {
    get: get
  }
}

function shouldHaveStatusMessage (statusMessage) {
  return function (test) {
    assert.strictEqual(test.res.statusMessage, statusMessage, 'should have statusMessage "' + statusMessage + '"')
  }
}


