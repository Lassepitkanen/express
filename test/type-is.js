import assert from 'assert';
import { typeofrequest, typeis, hasBody } from '../lib/deps/type-is/index.js';

describe('typeis(req, types)', function () {
  it('should ignore params', function () {
    var req = createRequest('text/html; charset=utf-8')
    assert.strictEqual(typeofrequest(req, ['text/*']), 'text/html')
  })

  it('should ignore params LWS', function () {
    var req = createRequest('text/html ; charset=utf-8')
    assert.strictEqual(typeofrequest(req, ['text/*']), 'text/html')
  })

  it('should ignore casing', function () {
    var req = createRequest('text/HTML')
    assert.strictEqual(typeofrequest(req, ['text/*']), 'text/html')
  })

  it('should fail invalid type', function () {
    var req = createRequest('text/html**')
    assert.strictEqual(typeofrequest(req, ['text/*']), false)
  })

  it('should not match invalid type', function () {
    var req = createRequest('text/html')
    assert.strictEqual(typeofrequest(req, ['text/html/']), false)
    assert.strictEqual(typeofrequest(req, [undefined, null, true, function () {}]), false)
  })

  describe('when no body is given', function () {
    it('should return null', function () {
      var req = { headers: {} }

      assert.strictEqual(typeofrequest(req), null)
      assert.strictEqual(typeofrequest(req, ['image/*']), null)
      assert.strictEqual(typeofrequest(req, 'image/*', 'text/*'), null)
    })
  })

  describe('when no content type is given', function () {
    it('should return false', function () {
      var req = createRequest()
      assert.strictEqual(typeofrequest(req), false)
      assert.strictEqual(typeofrequest(req, ['image/*']), false)
      assert.strictEqual(typeofrequest(req, ['text/*', 'image/*']), false)
    })
  })

  describe('give no types', function () {
    it('should return the mime type', function () {
      var req = createRequest('image/png')
      assert.strictEqual(typeofrequest(req), 'image/png')
    })
  })

  describe('given one type', function () {
    it('should return the type or false', function () {
      var req = createRequest('image/png')

      assert.strictEqual(typeofrequest(req, ['png']), 'png')
      assert.strictEqual(typeofrequest(req, ['.png']), '.png')
      assert.strictEqual(typeofrequest(req, ['image/png']), 'image/png')
      assert.strictEqual(typeofrequest(req, ['image/*']), 'image/png')
      assert.strictEqual(typeofrequest(req, ['*/png']), 'image/png')

      assert.strictEqual(typeofrequest(req, ['jpeg']), false)
      assert.strictEqual(typeofrequest(req, ['.jpeg']), false)
      assert.strictEqual(typeofrequest(req, ['image/jpeg']), false)
      assert.strictEqual(typeofrequest(req, ['text/*']), false)
      assert.strictEqual(typeofrequest(req, ['*/jpeg']), false)

      assert.strictEqual(typeofrequest(req, ['bogus']), false)
      assert.strictEqual(typeofrequest(req, ['something/bogus*']), false)
    })
  })

  describe('given multiple types', function () {
    it('should return the first match or false', function () {
      var req = createRequest('image/png')

      assert.strictEqual(typeofrequest(req, ['png']), 'png')
      assert.strictEqual(typeofrequest(req, '.png'), '.png')
      assert.strictEqual(typeofrequest(req, ['text/*', 'image/*']), 'image/png')
      assert.strictEqual(typeofrequest(req, ['image/*', 'text/*']), 'image/png')
      assert.strictEqual(typeofrequest(req, ['image/*', 'image/png']), 'image/png')
      assert.strictEqual(typeofrequest(req, 'image/png', 'image/*'), 'image/png')

      assert.strictEqual(typeofrequest(req, ['jpeg']), false)
      assert.strictEqual(typeofrequest(req, ['.jpeg']), false)
      assert.strictEqual(typeofrequest(req, ['text/*', 'application/*']), false)
      assert.strictEqual(typeofrequest(req, ['text/html', 'text/plain', 'application/json']), false)
    })
  })

  describe('given +suffix', function () {
    it('should match suffix types', function () {
      var req = createRequest('application/vnd+json')

      assert.strictEqual(typeofrequest(req, '+json'), 'application/vnd+json')
      assert.strictEqual(typeofrequest(req, 'application/vnd+json'), 'application/vnd+json')
      assert.strictEqual(typeofrequest(req, 'application/*+json'), 'application/vnd+json')
      assert.strictEqual(typeofrequest(req, '*/vnd+json'), 'application/vnd+json')
      assert.strictEqual(typeofrequest(req, 'application/json'), false)
      assert.strictEqual(typeofrequest(req, 'text/*+json'), false)
    })
  })

  describe('given "*/*"', function () {
    it('should match any content-type', function () {
      assert.strictEqual(typeofrequest(createRequest('text/html'), '*/*'), 'text/html')
      assert.strictEqual(typeofrequest(createRequest('text/xml'), '*/*'), 'text/xml')
      assert.strictEqual(typeofrequest(createRequest('application/json'), '*/*'), 'application/json')
      assert.strictEqual(typeofrequest(createRequest('application/vnd+json'), '*/*'), 'application/vnd+json')
    })

    it('should not match invalid content-type', function () {
      assert.strictEqual(typeofrequest(createRequest('bogus'), '*/*'), false)
    })

    it('should not match body-less request', function () {
      var req = { headers: { 'content-type': 'text/html' } }
      assert.strictEqual(typeofrequest(req, '*/*'), null)
    })
  })

  describe('when Content-Type: application/x-www-form-urlencoded', function () {
    it('should match "urlencoded"', function () {
      var req = createRequest('application/x-www-form-urlencoded')

      assert.strictEqual(typeofrequest(req, ['urlencoded']), 'urlencoded')
      assert.strictEqual(typeofrequest(req, ['json', 'urlencoded']), 'urlencoded')
      assert.strictEqual(typeofrequest(req, ['urlencoded', 'json']), 'urlencoded')
    })
  })

  describe('when Content-Type: multipart/form-data', function () {
    it('should match "multipart/*"', function () {
      var req = createRequest('multipart/form-data')

      assert.strictEqual(typeofrequest(req, ['multipart/*']), 'multipart/form-data')
    })

    it('should match "multipart"', function () {
      var req = createRequest('multipart/form-data')

      assert.strictEqual(typeofrequest(req, ['multipart']), 'multipart')
    })
  })
})

describe('typeis.hasBody(req)', function () {
  describe('content-length', function () {
    it('should indicate body', function () {
      var req = { headers: { 'content-length': '1' } }
      assert.strictEqual(hasBody(req), true)
    })

    it('should be true when 0', function () {
      var req = { headers: { 'content-length': '0' } }
      assert.strictEqual(hasBody(req), true)
    })

    it('should be false when bogus', function () {
      var req = { headers: { 'content-length': 'bogus' } }
      assert.strictEqual(hasBody(req), false)
    })
  })

  describe('transfer-encoding', function () {
    it('should indicate body', function () {
      var req = { headers: { 'transfer-encoding': 'chunked' } }
      assert.strictEqual(hasBody(req), true)
    })
  })
})

describe('typeis.is(mediaType, types)', function () {
  it('should ignore params', function () {
    assert.strictEqual(typeis('text/html; charset=utf-8', ['text/*']),
      'text/html')
  })

  it('should ignore casing', function () {
    assert.strictEqual(typeis('text/HTML', ['text/*']), 'text/html')
  })

  it('should fail invalid type', function () {
    assert.strictEqual(typeis('text/html**', ['text/*']), false)
  })

  it('should not match invalid type', function () {
    var req = createRequest('text/html')
    assert.strictEqual(typeis(req, ['text/html/']), false)
    assert.strictEqual(typeis(req, [undefined, null, true, function () {}]), false)
  })

  it('should not match invalid type', function () {
    assert.strictEqual(typeis('text/html', ['text/html/']), false)
    assert.strictEqual(typeis('text/html', [undefined, null, true, function () {}]), false)
  })

  describe('when no media type is given', function () {
    it('should return false', function () {
      assert.strictEqual(typeis(), false)
      assert.strictEqual(typeis('', ['application/json']), false)
      assert.strictEqual(typeis(null, ['image/*']), false)
      assert.strictEqual(typeis(undefined, ['text/*', 'image/*']), false)
    })
  })

  describe('given no types', function () {
    it('should return the mime type', function () {
      assert.strictEqual(typeis('image/png'), 'image/png')
    })
  })

  describe('given one type', function () {
    it('should return the type or false', function () {
      assert.strictEqual(typeis('image/png', ['png']), 'png')
      assert.strictEqual(typeis('image/png', ['.png']), '.png')
      assert.strictEqual(typeis('image/png', ['image/png']), 'image/png')
      assert.strictEqual(typeis('image/png', ['image/*']), 'image/png')
      assert.strictEqual(typeis('image/png', ['*/png']), 'image/png')

      assert.strictEqual(typeis('image/png', ['jpeg']), false)
      assert.strictEqual(typeis('image/png', ['.jpeg']), false)
      assert.strictEqual(typeis('image/png', ['image/jpeg']), false)
      assert.strictEqual(typeis('image/png', ['text/*']), false)
      assert.strictEqual(typeis('image/png', ['*/jpeg']), false)

      assert.strictEqual(typeis('image/png', ['bogus']), false)
      assert.strictEqual(typeis('image/png', ['something/bogus*']), false)
    })
  })

  describe('given multiple types', function () {
    it('should return the first match or false', function () {
      assert.strictEqual(typeis('image/png', ['png']), 'png')
      assert.strictEqual(typeis('image/png', '.png'), '.png')
      assert.strictEqual(typeis('image/png', ['text/*', 'image/*']), 'image/png')
      assert.strictEqual(typeis('image/png', ['image/*', 'text/*']), 'image/png')
      assert.strictEqual(typeis('image/png', ['image/*', 'image/png']), 'image/png')
      assert.strictEqual(typeis('image/png', 'image/png', 'image/*'), 'image/png')

      assert.strictEqual(typeis('image/png', ['jpeg']), false)
      assert.strictEqual(typeis('image/png', ['.jpeg']), false)
      assert.strictEqual(typeis('image/png', ['text/*', 'application/*']), false)
      assert.strictEqual(typeis('image/png', ['text/html', 'text/plain', 'application/json']), false)
    })
  })

  describe('given +suffix', function () {
    it('should match suffix types', function () {
      assert.strictEqual(typeis('application/vnd+json', '+json'), 'application/vnd+json')
      assert.strictEqual(typeis('application/vnd+json', 'application/vnd+json'), 'application/vnd+json')
      assert.strictEqual(typeis('application/vnd+json', 'application/*+json'), 'application/vnd+json')
      assert.strictEqual(typeis('application/vnd+json', '*/vnd+json'), 'application/vnd+json')
      assert.strictEqual(typeis('application/vnd+json', 'application/json'), false)
      assert.strictEqual(typeis('application/vnd+json', 'text/*+json'), false)
    })
  })

  describe('given "*/*"', function () {
    it('should match any media type', function () {
      assert.strictEqual(typeis('text/html', '*/*'), 'text/html')
      assert.strictEqual(typeis('text/xml', '*/*'), 'text/xml')
      assert.strictEqual(typeis('application/json', '*/*'), 'application/json')
      assert.strictEqual(typeis('application/vnd+json', '*/*'), 'application/vnd+json')
    })

    it('should not match invalid media type', function () {
      assert.strictEqual(typeis('bogus', '*/*'), false)
    })
  })

  describe('when media type is application/x-www-form-urlencoded', function () {
    it('should match "urlencoded"', function () {
      assert.strictEqual(typeis('application/x-www-form-urlencoded', ['urlencoded']), 'urlencoded')
      assert.strictEqual(typeis('application/x-www-form-urlencoded', ['json', 'urlencoded']), 'urlencoded')
      assert.strictEqual(typeis('application/x-www-form-urlencoded', ['urlencoded', 'json']), 'urlencoded')
    })
  })

  describe('when media type is multipart/form-data', function () {
    it('should match "multipart/*"', function () {
      assert.strictEqual(typeis('multipart/form-data', ['multipart/*']), 'multipart/form-data')
    })

    it('should match "multipart"', function () {
      assert.strictEqual(typeis('multipart/form-data', ['multipart']), 'multipart')
    })
  })

  describe('when give request object', function () {
    it('should use the content-type header', function () {
      var req = createRequest('image/png')

      assert.strictEqual(typeis(req, ['png']), 'png')
      assert.strictEqual(typeis(req, ['jpeg']), false)
    })

    it('should not check for body', function () {
      var req = { headers: { 'content-type': 'text/html' } }

      assert.strictEqual(typeis(req, ['html']), 'html')
      assert.strictEqual(typeis(req, ['jpeg']), false)
    })
  })
})

function createRequest (type) {
  return {
    headers: {
      'content-type': type || undefined,
      'transfer-encoding': 'chunked'
    }
  }
}
