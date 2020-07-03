import assert from 'assert';
import { parseUrl } from '../lib/deps/parseUrl/index.js';
import * as url from 'url';

const URL_EMPTY_VALUE = url.Url
  ? null : void 0

describe('parseUrl(req)', function () {
  it('should parse the requrst URL', function () {
    const req = createReq('/foo/bar')
    const url = parseUrl(req)
    assert.strictEqual(url.host, URL_EMPTY_VALUE)
    assert.strictEqual(url.hostname, URL_EMPTY_VALUE)
    assert.strictEqual(url.href, '/foo/bar')
    assert.strictEqual(url.pathname, '/foo/bar')
    assert.strictEqual(url.port, URL_EMPTY_VALUE)
    assert.strictEqual(url.query, URL_EMPTY_VALUE)
    assert.strictEqual(url.search, URL_EMPTY_VALUE)
  })

  it('should parse with query string', function () {
    const req = createReq('/foo/bar?fizz=buzz')
    const url = parseUrl(req)
    assert.strictEqual(url.host, URL_EMPTY_VALUE)
    assert.strictEqual(url.hostname, URL_EMPTY_VALUE)
    assert.strictEqual(url.href, '/foo/bar?fizz=buzz')
    assert.strictEqual(url.pathname, '/foo/bar')
    assert.strictEqual(url.port, URL_EMPTY_VALUE)
    assert.strictEqual(url.query, 'fizz=buzz')
    assert.strictEqual(url.search, '?fizz=buzz')
  })

  it('should parse a full URL', function () {
    const req = createReq('http://localhost:8888/foo/bar')
    const url = parseUrl(req)
    assert.strictEqual(url.host, 'localhost:8888')
    assert.strictEqual(url.hostname, 'localhost')
    assert.strictEqual(url.href, 'http://localhost:8888/foo/bar')
    assert.strictEqual(url.pathname, '/foo/bar')
    assert.strictEqual(url.port, '8888')
    assert.strictEqual(url.query, URL_EMPTY_VALUE)
    assert.strictEqual(url.search, URL_EMPTY_VALUE)
  })

  it('should not choke on auth-looking URL', function () {
    const req = createReq('//todo@txt')
    assert.strictEqual(parseUrl(req).pathname, '//todo@txt')
  })

  it('should return undefined missing url', function () {
    const req = createReq()
    const url = parseUrl(req)
    assert.strictEqual(url, undefined)
  })

  describe('when using the same request', function () {
    it('should parse multiple times', function () {
      const req = createReq('/foo/bar')
      assert.strictEqual(parseUrl(req).pathname, '/foo/bar')
      assert.strictEqual(parseUrl(req).pathname, '/foo/bar')
      assert.strictEqual(parseUrl(req).pathname, '/foo/bar')
    })

    it('should reflect url changes', function () {
      const req = createReq('/foo/bar')
      let url = parseUrl(req)
      const val = Math.random()

      url._token = val
      assert.strictEqual(url._token, val)
      assert.strictEqual(url.pathname, '/foo/bar')

      req.url = '/bar/baz'
      url = parseUrl(req)
      assert.strictEqual(url._token, undefined)
      assert.strictEqual(parseUrl(req).pathname, '/bar/baz')
    })

    it('should cache parsing', function () {
      const req = createReq('/foo/bar')
      let url = parseUrl(req)
      const val = Math.random()

      url._token = val
      assert.strictEqual(url._token, val)
      assert.strictEqual(url.pathname, '/foo/bar')

      url = parseUrl(req)
      assert.strictEqual(url._token, val)
      assert.strictEqual(url.pathname, '/foo/bar')
    })

    it('should cache parsing where href does not match', function () {
      const req = createReq('/foo/bar ')
      let url = parseUrl(req)
      const val = Math.random()

      url._token = val
      assert.strictEqual(url._token, val)
      assert.strictEqual(url.pathname, '/foo/bar')

      url = parseUrl(req)
      assert.strictEqual(url._token, val)
      assert.strictEqual(url.pathname, '/foo/bar')
    })
  })
})

function createReq (url, originalUrl) {
  return {
    originalUrl: originalUrl,
    url: url
  }
}
