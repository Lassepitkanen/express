import assert from 'assert';
import { format, parse } from 'media-typer';

const invalidTypes = [
  ' ',
  'null',
  'undefined',
  '/',
  'text/;plain',
  'text/"plain"',
  'text/p£ain',
  'text/(plain)',
  'text/@plain',
  'text/plain,wrong'
]

describe('format(obj)', function () {
  it('should format basic type', function () {
    var str = format({ type: 'text', subtype: 'html' })
    assert.strictEqual(str, 'text/html')
  })

  it('should format type with suffix', function () {
    var str = format({ type: 'image', subtype: 'svg', suffix: 'xml' })
    assert.strictEqual(str, 'image/svg+xml')
  })

  it('should require argument', function () {
    assert.throws(format.bind(null), /obj.*required/)
  })

  it('should reject non-objects', function () {
    assert.throws(format.bind(null, 7), /obj.*required/)
  })

  it('should require type', function () {
    assert.throws(format.bind(null, {}), /invalid type/)
  })

  it('should reject invalid type', function () {
    assert.throws(format.bind(null, { type: 'text/' }), /invalid type/)
  })

  it('should require subtype', function () {
    assert.throws(format.bind(null, { type: 'text' }), /invalid subtype/)
  })

  it('should reject invalid subtype', function () {
    var obj = { type: 'text', subtype: 'html/' }
    assert.throws(format.bind(null, obj), /invalid subtype/)
  })

  it('should reject invalid suffix', function () {
    var obj = { type: 'image', subtype: 'svg', suffix: 'xml\\' }
    assert.throws(format.bind(null, obj), /invalid suffix/)
  })
})

describe('parse(string)', function () {
  it('should parse basic type', function () {
    var type = parse('text/html')
    assert.strictEqual(type.type, 'text')
    assert.strictEqual(type.subtype, 'html')
  })

  it('should parse with suffix', function () {
    var type = parse('image/svg+xml')
    assert.strictEqual(type.type, 'image')
    assert.strictEqual(type.subtype, 'svg')
    assert.strictEqual(type.suffix, 'xml')
  })

  it('should lower-case type', function () {
    var type = parse('IMAGE/SVG+XML')
    assert.strictEqual(type.type, 'image')
    assert.strictEqual(type.subtype, 'svg')
    assert.strictEqual(type.suffix, 'xml')
  })

  invalidTypes.forEach(function (type) {
    it('should throw on invalid media type ' + JSON.stringify(type), function () {
      assert.throws(parse.bind(null, type), /invalid media type/)
    })
  })

  it('should require argument', function () {
    assert.throws(parse.bind(null), /string.*required/)
  })

  it('should reject non-strings', function () {
    assert.throws(parse.bind(null, 7), /string.*required/)
  })
})
