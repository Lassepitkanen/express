"use strict";

const BOMChar = '\uFEFF';


export function PrependBOM(encoder, options) {
  this.encoder = encoder;
  this.addBOM = true;
}

PrependBOM.prototype.write = function(str) {
  if (this.addBOM) {
    str = BOMChar + str;
    this.addBOM = false;
  }

  return this.encoder.write(str);
}

PrependBOM.prototype.end = function() {
  return this.encoder.end();
}


//------------------------------------------------------------------------------


export function StripBOM(decoder, options) {
  this.decoder = decoder;
  this.pass = false;
  this.options = options || {};
}

StripBOM.prototype.write = function(buf) {
  let res = this.decoder.write(buf);
  if (this.pass || !res)
      return res;

  if (res[0] === BOMChar) {
    res = res.slice(1);
    if (typeof this.options.stripBOM === 'function')
      this.options.stripBOM();
  }

  this.pass = true;
  return res;
}

StripBOM.prototype.end = function() {
  return this.decoder.end();
}

