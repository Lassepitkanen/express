"use strict";
import { Buffer } from 'safe-buffer';

// Single-byte codec. Needs a 'chars' string parameter that contains 256 or 128 chars that
// correspond to encoded bytes (if 128 - then lower half is ASCII).

export const _sbcs = SBCSCodec;
function SBCSCodec(codecOptions, iconv) {
  if (!codecOptions)
    throw new Error("SBCS codec is called without the data.");

  // Prepare char buffer for decoding.
  if (!codecOptions.chars || (codecOptions.chars.length !== 128 && codecOptions.chars.length !== 256))
    throw new Error("Encoding '"+codecOptions.type+"' has incorrect 'chars' (must be of len 128 or 256)");

  if (codecOptions.chars.length === 128) {
    let asciiString = "";
    for (let i = 0; i < 128; ++i)
      asciiString += String.fromCharCode(i);
    codecOptions.chars = asciiString + codecOptions.chars;
  }

  this.decodeBuf = Buffer.from(codecOptions.chars, 'ucs2');

  // Encoding buffer.
  const encodeBuf = Buffer.alloc(65536, iconv.defaultCharSingleByte.charCodeAt(0));
  const len = codecOptions.chars.length;
  for (let i = 0; i < len; ++i)
     encodeBuf[codecOptions.chars.charCodeAt(i)] = i;

  this.encodeBuf = encodeBuf;
}

SBCSCodec.prototype.encoder = SBCSEncoder;
SBCSCodec.prototype.decoder = SBCSDecoder;


function SBCSEncoder(options, codec) {
  this.encodeBuf = codec.encodeBuf;
}

SBCSEncoder.prototype.write = function(str) {
  const len = str.length;
  const buf = Buffer.alloc(len);
  for (let i = 0; i < len; ++i)
    buf[i] = this.encodeBuf[str.charCodeAt(i)];

  return buf;
}

SBCSEncoder.prototype.end = function() {
}


function SBCSDecoder(options, codec) {
  this.decodeBuf = codec.decodeBuf;
}

SBCSDecoder.prototype.write = function(buf) {
  const len = buf.length;
  // Strings are immutable in JS -> we use ucs2 buffer to speed up computations.
  const decodeBuf = this.decodeBuf;
  const newBuf = Buffer.alloc(len * 2);
  let idx1 = 0, idx2 = 0;
  for (let i = 0; i < len; ++i) {
    idx1 = buf[i]*2; idx2 = i*2;
    newBuf[idx2] = decodeBuf[idx1];
    newBuf[idx2+1] = decodeBuf[idx1+1];
  }
  return newBuf.toString('ucs2');
}

SBCSDecoder.prototype.end = function() {
}
