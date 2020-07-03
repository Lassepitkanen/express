import assert from 'assert';
import { charset, contentType, extension, lookup  } from '../lib/deps/mime-types/index.js';

describe('mimeTypes', function () {
  describe('.charset(type)', function () {
    it('should return "UTF-8" for "application/json"', function () {
      assert.strictEqual(charset('application/json'), 'UTF-8')
    })

    it('should return "UTF-8" for "application/json; foo=bar"', function () {
      assert.strictEqual(charset('application/json; foo=bar'), 'UTF-8')
    })

    it('should return "UTF-8" for "application/javascript"', function () {
      assert.strictEqual(charset('application/javascript'), 'UTF-8')
    })

    it('should return "UTF-8" for "application/JavaScript"', function () {
      assert.strictEqual(charset('application/JavaScript'), 'UTF-8')
    })

    it('should return "UTF-8" for "text/html"', function () {
      assert.strictEqual(charset('text/html'), 'UTF-8')
    })

    it('should return "UTF-8" for "TEXT/HTML"', function () {
      assert.strictEqual(charset('TEXT/HTML'), 'UTF-8')
    })

    it('should return "UTF-8" for any text/*', function () {
      assert.strictEqual(charset('text/x-bogus'), 'UTF-8')
    })

    it('should return false for unknown types', function () {
      assert.strictEqual(charset('application/x-bogus'), false)
    })

    it('should return false for any application/octet-stream', function () {
      assert.strictEqual(charset('application/octet-stream'), false)
    })

    it('should return false for invalid arguments', function () {
      assert.strictEqual(charset({}), false)
      assert.strictEqual(charset(null), false)
      assert.strictEqual(charset(true), false)
      assert.strictEqual(charset(42), false)
    })
  })

  describe('.contentType(extension)', function () {
    it('should return content-type for "html"', function () {
      assert.strictEqual(contentType('html'), 'text/html; charset=utf-8')
    })

    it('should return content-type for ".html"', function () {
      assert.strictEqual(contentType('.html'), 'text/html; charset=utf-8')
    })

    it('should return content-type for "jade"', function () {
      assert.strictEqual(contentType('jade'), 'text/jade; charset=utf-8')
    })

    it('should return content-type for "json"', function () {
      assert.strictEqual(contentType('json'), 'application/json; charset=utf-8')
    })

    it('should return false for unknown extensions', function () {
      assert.strictEqual(contentType('bogus'), false)
    })

    it('should return false for invalid arguments', function () {
      assert.strictEqual(contentType({}), false)
      assert.strictEqual(contentType(null), false)
      assert.strictEqual(contentType(true), false)
      assert.strictEqual(contentType(42), false)
    })
  })

  describe('.contentType(type)', function () {
    it('should attach charset to "application/json"', function () {
      assert.strictEqual(contentType('application/json'), 'application/json; charset=utf-8')
    })

    it('should attach charset to "application/json; foo=bar"', function () {
      assert.strictEqual(contentType('application/json; foo=bar'), 'application/json; foo=bar; charset=utf-8')
    })

    it('should attach charset to "TEXT/HTML"', function () {
      assert.strictEqual(contentType('TEXT/HTML'), 'TEXT/HTML; charset=utf-8')
    })

    it('should attach charset to "text/html"', function () {
      assert.strictEqual(contentType('text/html'), 'text/html; charset=utf-8')
    })

    it('should not alter "text/html; charset=iso-8859-1"', function () {
      assert.strictEqual(contentType('text/html; charset=iso-8859-1'), 'text/html; charset=iso-8859-1')
    })

    it('should return type for unknown types', function () {
      assert.strictEqual(contentType('application/x-bogus'), 'application/x-bogus')
    })
  })

  describe('.extension(type)', function () {
    it('should return extension for mime type', function () {
      assert.strictEqual(extension('text/html'), 'html')
      assert.strictEqual(extension(' text/html'), 'html')
      assert.strictEqual(extension('text/html '), 'html')
    })

    it('should return false for unknown type', function () {
      assert.strictEqual(extension('application/x-bogus'), false)
    })

    it('should return false for non-type string', function () {
      assert.strictEqual(extension('bogus'), false)
    })

    it('should return false for non-strings', function () {
      assert.strictEqual(extension(null), false)
      assert.strictEqual(extension(undefined), false)
      assert.strictEqual(extension(42), false)
      assert.strictEqual(extension({}), false)
    })

    it('should return extension for mime type with parameters', function () {
      assert.strictEqual(extension('text/html;charset=UTF-8'), 'html')
      assert.strictEqual(extension('text/HTML; charset=UTF-8'), 'html')
      assert.strictEqual(extension('text/html; charset=UTF-8'), 'html')
      assert.strictEqual(extension('text/html; charset=UTF-8 '), 'html')
      assert.strictEqual(extension('text/html ; charset=UTF-8'), 'html')
    })
  })

  describe('.lookup(extension)', function () {
    it('should return mime type for ".html"', function () {
      assert.strictEqual(lookup('.html'), 'text/html')
    })

    it('should return mime type for ".js"', function () {
      assert.strictEqual(lookup('.js'), 'application/javascript')
    })

    it('should return mime type for ".json"', function () {
      assert.strictEqual(lookup('.json'), 'application/json')
    })

    it('should return mime type for ".rtf"', function () {
      assert.strictEqual(lookup('.rtf'), 'application/rtf')
    })

    it('should return mime type for ".txt"', function () {
      assert.strictEqual(lookup('.txt'), 'text/plain')
    })

    it('should return mime type for ".xml"', function () {
      assert.strictEqual(lookup('.xml'), 'application/xml')
    })

    it('should work without the leading dot', function () {
      assert.strictEqual(lookup('html'), 'text/html')
      assert.strictEqual(lookup('xml'), 'application/xml')
    })

    it('should be case insensitive', function () {
      assert.strictEqual(lookup('HTML'), 'text/html')
      assert.strictEqual(lookup('.Xml'), 'application/xml')
    })

    it('should return false for unknown extension', function () {
      assert.strictEqual(lookup('.bogus'), false)
      assert.strictEqual(lookup('bogus'), false)
    })

    it('should return false for non-strings', function () {
      assert.strictEqual(lookup(null), false)
      assert.strictEqual(lookup(undefined), false)
      assert.strictEqual(lookup(42), false)
      assert.strictEqual(lookup({}), false)
    })
  })

  describe('.lookup(path)', function () {
    it('should return mime type for file name', function () {
      assert.strictEqual(lookup('page.html'), 'text/html')
    })

    it('should return mime type for relative path', function () {
      assert.strictEqual(lookup('path/to/page.html'), 'text/html')
      assert.strictEqual(lookup('path\\to\\page.html'), 'text/html')
    })

    it('should return mime type for absolute path', function () {
      assert.strictEqual(lookup('/path/to/page.html'), 'text/html')
      assert.strictEqual(lookup('C:\\path\\to\\page.html'), 'text/html')
    })

    it('should be case insensitive', function () {
      assert.strictEqual(lookup('/path/to/PAGE.HTML'), 'text/html')
      assert.strictEqual(lookup('C:\\path\\to\\PAGE.HTML'), 'text/html')
    })

    it('should return false for unknown extension', function () {
      assert.strictEqual(lookup('/path/to/file.bogus'), false)
    })

    it('should return false for path without extension', function () {
      assert.strictEqual(lookup('/path/to/json'), false)
    })

    describe('path with dotfile', function () {
      it('should return false when extension-less', function () {
        assert.strictEqual(lookup('/path/to/.json'), false)
      })

      it('should return mime type when there is extension', function () {
        assert.strictEqual(lookup('/path/to/.config.json'), 'application/json')
      })

      it('should return mime type when there is extension, but no path', function () {
        assert.strictEqual(lookup('.config.json'), 'application/json')
      })
    })
  })
})
