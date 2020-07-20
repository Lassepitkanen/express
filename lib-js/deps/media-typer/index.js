/*!
 * media-typer
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * RegExp to match *( ";" parameter ) in RFC 2616 sec 3.7
 *
 * parameter     = token "=" ( token | quoted-string )
 * token         = 1*<any CHAR except CTLs or separators>
 * separators    = "(" | ")" | "<" | ">" | "@"
 *               | "," | ";" | ":" | "\" | <">
 *               | "/" | "[" | "]" | "?" | "="
 *               | "{" | "}" | SP | HT
 * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
 * qdtext        = <any TEXT except <">>
 * quoted-pair   = "\" CHAR
 * CHAR          = <any US-ASCII character (octets 0 - 127)>
 * TEXT          = <any OCTET except CTLs, but including LWS>
 * LWS           = [CRLF] 1*( SP | HT )
 * CRLF          = CR LF
 * CR            = <US-ASCII CR, carriage return (13)>
 * LF            = <US-ASCII LF, linefeed (10)>
 * SP            = <US-ASCII SP, space (32)>
 * SHT           = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 */
const paramRegExp = /; *([!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) *= *("(?:[ !\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u0020-\u007e])*"|[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) */g;
const textRegExp = /^[\u0020-\u007e\u0080-\u00ff]+$/;
const tokenRegExp = /^[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+$/;

/**
 * RegExp to match quoted-pair in RFC 2616
 *
 * quoted-pair = "\" CHAR
 * CHAR        = <any US-ASCII character (octets 0 - 127)>
 */
const qescRegExp = /\\([\u0000-\u007f])/g;

/**
 * RegExp to match chars that must be quoted-pair in RFC 2616
 */
const quoteRegExp = /([\\"])/g;

/**
 * RegExp to match type in RFC 6838
 *
 * type-name = restricted-name
 * subtype-name = restricted-name
 * restricted-name = restricted-name-first *126restricted-name-chars
 * restricted-name-first  = ALPHA / DIGIT
 * restricted-name-chars  = ALPHA / DIGIT / "!" / "#" /
 *                          "$" / "&" / "-" / "^" / "_"
 * restricted-name-chars =/ "." ; Characters before first dot always
 *                              ; specify a facet name
 * restricted-name-chars =/ "+" ; Characters after last plus always
 *                              ; specify a structured syntax suffix
 * ALPHA =  %x41-5A / %x61-7A   ; A-Z / a-z
 * DIGIT =  %x30-39             ; 0-9
 */
const subtypeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/
const typeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/
const typeRegExp = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;


/**
 * Format object to media type.
 *
 * @param {object} obj
 * @return {string}
 * @api public
 */

export function format(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new TypeError('argument obj is required');
  }

  const parameters = obj.parameters;
  const subtype = obj.subtype;
  const suffix = obj.suffix;
  const type = obj.type;

  if (!type || !typeNameRegExp.test(type)) {
    throw new TypeError('invalid type');
  }

  if (!subtype || !subtypeNameRegExp.test(subtype)) {
    throw new TypeError('invalid subtype');
  }

  // format as type/subtype
  let string = type + '/' + subtype;

  // append +suffix
  if (suffix) {
    if (!typeNameRegExp.test(suffix)) {
      throw new TypeError('invalid suffix');
    }

    string += '+' + suffix;
  }

  // append parameters
  if (parameters && typeof parameters === 'object') {
    let param
    const params = Object.keys(parameters).sort()
    const len = params.length;
    for (let i = 0; i < len; ++i) {
      param = params[i]

      if (!tokenRegExp.test(param)) {
        throw new TypeError('invalid parameter name');
      }

      string += '; ' + param + '=' + qstring(parameters[param]);
    }
  }

  return string;
}

/**
 * Parse media type to object.
 *
 * @param {string|object} string
 * @return {Object}
 * @api public
 */

export function parse(string) {
  if (!string) {
    throw new TypeError('argument string is required');
  }

  // support req/res-like objects as argument
  if (typeof string === 'object') {
    string = getcontenttype(string);
  }

  if (typeof string !== 'string') {
    throw new TypeError('argument string is required to be a string');
  }

  let index = string.indexOf(';')
  const type = index !== -1
    ? string.substr(0, index)
    : string;

  let key;
  let match;
  const obj = splitType(type);
  let params = {};
  let value;

  paramRegExp.lastIndex = index;

  while (match = paramRegExp.exec(string)) {
    if (match.index !== index) {
      throw new TypeError('invalid parameter format');
    }

    index += match[0].length;
    key = match[1].toLowerCase();
    value = match[2];

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value
        .substr(1, value.length - 2)
        .replace(qescRegExp, '$1');
    }

    params[key] = value;
  }

  if (index !== -1 && index !== string.length) {
    throw new TypeError('invalid parameter format');
  }

  obj.parameters = params;

  return obj;
}

/**
 * Get content-type from req/res objects.
 *
 * @param {object}
 * @return {Object}
 * @api private
 */

function getcontenttype(obj) {
  if (typeof obj.getHeader === 'function') {
    // res-like
    return obj.getHeader('content-type');
  }

  if (typeof obj.headers === 'object') {
    // req-like
    return obj.headers && obj.headers['content-type'];
  }
}

/**
 * Quote a string if necessary.
 *
 * @param {string} val
 * @return {string}
 * @api private
 */

function qstring(val) {
  const str = String(val);

  // no need to quote tokens
  if (tokenRegExp.test(str)) {
    return str;
  }

  if (str.length > 0 && !textRegExp.test(str)) {
    throw new TypeError('invalid parameter value');
  }

  return '"' + str.replace(quoteRegExp, '\\$1') + '"';
}

/**
 * Simply "type/subtype+siffx" into parts.
 *
 * @param {string} string
 * @return {Object}
 * @api private
 */

function splitType(string) {
  const match = typeRegExp.exec(string.toLowerCase());

  if (!match) {
    throw new TypeError('invalid media type');
  }

  const type = match[1];
  let subtype = match[2];
  let suffix;

  // suffix after last +
  const index = subtype.lastIndexOf('+');
  if (index !== -1) {
    suffix = subtype.substr(index + 1);
    subtype = subtype.substr(0, index);
  }

  const obj = {
    type: type,
    subtype: subtype,
    suffix: suffix
  };

  return obj;
}
