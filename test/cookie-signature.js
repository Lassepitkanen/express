import { sign, unsign } from '../lib/deps/cookie-signature/index.js';
import assert from 'assert';

describe('.sign(val, secret)', function(){
  it('should sign the cookie', function(){
    var val = sign('hello', 'tobiiscool');
    assert.equal(val, 'hello.DGDUkGlIkCzPz+C0B064FNgHdEjox7ch8tOBGslZ5QI')
    var val = sign('hello', 'luna');
    assert.notEqual(val, 'hello.DGDUkGlIkCzPz+C0B064FNgHdEjox7ch8tOBGslZ5QI')
  })
})

describe('.unsign(val, secret)', function(){
  it('should unsign the cookie', function(){
    var val = sign('hello', 'tobiiscool');
    unsign(val, 'tobiiscool').should.equal('hello');
    unsign(val, 'luna').should.be.false;
  })
})
