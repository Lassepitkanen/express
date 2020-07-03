import assert from 'assert';
import { parse, serialize } from '../lib/deps/cookie/index.js';

describe('cookie', function () {
  it('argument validation', function() {
    assert.throws(parse.bind(), /argument str must be a string/);
    assert.throws(parse.bind(null, 42), /argument str must be a string/);
  })

  it('basic', function() {
    assert.deepEqual({ foo: 'bar' }, parse('foo=bar'));
    assert.deepEqual({ foo: '123' }, parse('foo=123'));
  });

  it('ignore spaces', function() {
    assert.deepEqual({ FOO: 'bar', baz: 'raz' },
      parse('FOO    = bar;   baz  =   raz'));
  });

  it('escaping', function() {
    assert.deepEqual({ foo: 'bar=123456789&name=Magic+Mouse' },
      parse('foo="bar=123456789&name=Magic+Mouse"'));

    assert.deepEqual({ email: ' ",;/' },
      parse('email=%20%22%2c%3b%2f'));
  });

  it('ignore escaping error and return original value', function() {
    assert.deepEqual({ foo: '%1', bar: 'bar' }, parse('foo=%1;bar=bar'));
  });

  it('ignore non values', function() {
    assert.deepEqual({ foo: '%1', bar: 'bar' }, parse('foo=%1;bar=bar;HttpOnly;Secure'));
  });

  it('unencoded', function() {
    assert.deepEqual({ foo: 'bar=123456789&name=Magic+Mouse' },
      parse('foo="bar=123456789&name=Magic+Mouse"',{
        decode: function(value) { return value; }
      }));

    assert.deepEqual({ email: '%20%22%2c%3b%2f' },
      parse('email=%20%22%2c%3b%2f',{
        decode: function(value) { return value; }
      }));
  });

  it('dates', function() {
    assert.deepEqual({ priority: 'true', Path: '/', expires: 'Wed, 29 Jan 2014 17:43:25 GMT' },
      parse('priority=true; expires=Wed, 29 Jan 2014 17:43:25 GMT; Path=/',{
        decode: function(value) { return value; }
      }));
  });

  it('missing value', function() {
    assert.deepEqual({ bar: '1', fizz: '', buzz: '2' },
      parse('foo; bar=1; fizz= ; buzz=2',{
        decode: function(value) { return value; }
      }));
  });

  it('assign only once', function() {
    assert.deepEqual({ foo: '%1', bar: 'bar' },
      parse('foo=%1;bar=bar;foo=boo'));
    assert.deepEqual({ foo: 'false', bar: 'bar' },
      parse('foo=false;bar=bar;foo=true'));
    assert.deepEqual({ foo: '', bar: 'bar' },
      parse('foo=;bar=bar;foo=boo'));
  });


  it('basic', function() {
    assert.equal('foo=bar', serialize('foo', 'bar'));
    assert.equal('foo=bar%20baz', serialize('foo', 'bar baz'));
    assert.equal('foo=', serialize('foo', ''));
    assert.throws(serialize.bind(serialize, 'foo\n', 'bar'), /argument name is invalid/);
    assert.throws(serialize.bind(serialize, 'foo\u280a', 'bar'), /argument name is invalid/);
    assert.throws(serialize.bind(serialize, 'foo', 'bar', {encode: 42}), /option encode is invalid/);
  });

  it('path', function() {
    assert.equal('foo=bar; Path=/', serialize('foo', 'bar', {
      path: '/'
    }));

    assert.throws(serialize.bind(serialize, 'foo', 'bar', {
      path: '/\n'
    }), /option path is invalid/);
  });

  it('secure', function() {
    assert.equal('foo=bar; Secure', serialize('foo', 'bar', {
      secure: true
    }));

    assert.equal('foo=bar', serialize('foo', 'bar', {
      secure: false
    }));
  });

  it('domain', function() {
    assert.equal('foo=bar; Domain=example.com', serialize('foo', 'bar', {
      domain: 'example.com'
    }));

    assert.throws(serialize.bind(serialize, 'foo', 'bar', {
      domain: 'example.com\n'
    }), /option domain is invalid/);
  });

  it('httpOnly', function() {
    assert.equal('foo=bar; HttpOnly', serialize('foo', 'bar', {
      httpOnly: true
    }));
  });

  it('maxAge', function() {
    assert.throws(function () {
      serialize('foo', 'bar', {
        maxAge: 'buzz'
      });
    }, /option maxAge is invalid/)

    assert.throws(function () {
      serialize('foo', 'bar', {
        maxAge: Infinity
      })
    }, /option maxAge is invalid/)

    assert.equal('foo=bar; Max-Age=1000', serialize('foo', 'bar', {
      maxAge: 1000
    }));

    assert.equal('foo=bar; Max-Age=1000', serialize('foo', 'bar', {
      maxAge: '1000'
    }));

    assert.equal('foo=bar; Max-Age=0', serialize('foo', 'bar', {
      maxAge: 0
    }));

    assert.equal('foo=bar; Max-Age=0', serialize('foo', 'bar', {
      maxAge: '0'
    }));

    assert.equal('foo=bar', serialize('foo', 'bar', {
      maxAge: null
    }));

    assert.equal('foo=bar', serialize('foo', 'bar', {
      maxAge: undefined
    }));

    assert.equal('foo=bar; Max-Age=3', serialize('foo', 'bar', {
      maxAge: 3.14
    }));
  });

  it('expires', function() {
    assert.equal('foo=bar; Expires=Sun, 24 Dec 2000 10:30:59 GMT', serialize('foo', 'bar', {
      expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900))
    }));

    assert.throws(serialize.bind(serialize, 'foo', 'bar', {
      expires: Date.now()
    }), /option expires is invalid/);
  });

  it('sameSite', function() {
    assert.equal('foo=bar; SameSite=Strict', serialize('foo', 'bar', {
      sameSite: true
    }));

    assert.equal('foo=bar; SameSite=Strict', serialize('foo', 'bar', {
      sameSite: 'Strict'
    }));

    assert.equal('foo=bar; SameSite=Strict', serialize('foo', 'bar', {
      sameSite: 'strict'
    }));

    assert.equal('foo=bar; SameSite=Lax', serialize('foo', 'bar', {
      sameSite: 'Lax'
    }));

    assert.equal('foo=bar; SameSite=Lax', serialize('foo', 'bar', {
      sameSite: 'lax'
    }));

    assert.equal('foo=bar; SameSite=None', serialize('foo', 'bar', {
      sameSite: 'None'
    }));

    assert.equal('foo=bar; SameSite=None', serialize('foo', 'bar', {
      sameSite: 'none'
    }));

    assert.equal('foo=bar', serialize('foo', 'bar', {
      sameSite: false
    }));

    assert.throws(serialize.bind(serialize, 'foo', 'bar', {
      sameSite: 'foo'
    }), /option sameSite is invalid/);
  });

  it('escaping', function() {
    assert.deepEqual('cat=%2B%20', serialize('cat', '+ '));
  });

  it('parse->serialize', function() {

    assert.deepEqual({ cat: 'foo=123&name=baz five' }, parse(
      serialize('cat', 'foo=123&name=baz five')));

    assert.deepEqual({ cat: ' ";/' }, parse(
      serialize('cat', ' ";/')));
  });

  it('unencoded', function() {
    assert.deepEqual('cat=+ ', serialize('cat', '+ ', {
      encode: function(value) { return value; }
    }));

    assert.throws(serialize.bind(serialize, 'cat', '+ \n', {
      encode: function(value) { return value; }
    }), /argument val is invalid/);
  })
});
