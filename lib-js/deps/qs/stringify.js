'use strict';

import utils from './utils.js';
import formats from './formats.js';

const has = Object.prototype.hasOwnProperty;

const arrayPrefixGenerators = {
  brackets: function brackets(prefix) {
    return prefix + '[]';
  },
  comma: 'comma',
  indices: function indices(prefix, key) {
    return prefix + '[' + key + ']';
  },
  repeat: function repeat(prefix) {
    return prefix;
  }
};

const isArray = Array.isArray;
const push = Array.prototype.push;
const pushToArray = function (arr, valueOrArray) {
  push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
};

const toISO = Date.prototype.toISOString;

const defaultFormat = formats['default'];
const defaults = {
  addQueryPrefix: false,
  allowDots: false,
  charset: 'utf-8',
  charsetSentinel: false,
  delimiter: '&',
  encode: true,
  encoder: utils.encode,
  encodeValuesOnly: false,
  format: defaultFormat,
  formatter: formats.formatters[defaultFormat],
  // deprecated
  indices: false,
  serializeDate: function serializeDate(date) {
      return toISO.call(date);
  },
  skipNulls: false,
  strictNullHandling: false
};

const isNonNullishPrimitive = function isNonNullishPrimitive(v) {
  return typeof v === 'string'
    || typeof v === 'number'
    || typeof v === 'boolean'
    || typeof v === 'symbol'
    || typeof v === 'bigint';
};

const stringify = function stringify(
  object,
  prefix,
  generateArrayPrefix,
  strictNullHandling,
  skipNulls,
  encoder,
  filter,
  sort,
  allowDots,
  serializeDate,
  formatter,
  encodeValuesOnly,
  charset
) {
  let obj = object;
  if (typeof filter === 'function') {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate(obj);
  } else if (generateArrayPrefix === 'comma' && isArray(obj)) {
    obj = utils.maybeMap(obj, function (value) {
      if (value instanceof Date) {
        return serializeDate(value);
      }
      return value;
    }).join(',');
  }

  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key') : prefix;
    }

    obj = '';
  }

  if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
    if (encoder) {
      const keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key');
      return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value'))];
    }
    return [formatter(prefix) + '=' + formatter(String(obj))];
  }

  const values = [];

  if (typeof obj === 'undefined') {
    return values;
  }

  let objKeys;
  if (isArray(filter)) {
    objKeys = filter;
  } else {
    let keys = Object.keys(obj);
    objKeys = sort ? keys.sort(sort) : keys;
  }

  const len = objKeys.length;
  for (let i = 0; i < len; ++i) {
    const key = objKeys[i];
    const value = obj[key];

    if (skipNulls && value === null) {
      continue;
    }

    const keyPrefix = isArray(obj)
      ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(prefix, key) : prefix
      : prefix + (allowDots ? '.' + key : '[' + key + ']');

    pushToArray(values, stringify(
      value,
      keyPrefix,
      generateArrayPrefix,
      strictNullHandling,
      skipNulls,
      encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      formatter,
      encodeValuesOnly,
      charset
    ));
  }

  return values;
};

const normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
  if (!opts) {
    return defaults;
  }

  if (opts.encoder !== null && opts.encoder !== void 0 && typeof opts.encoder !== 'function') {
    throw new TypeError('Encoder has to be a function.');
  }

  const charset = opts.charset || defaults.charset;
  if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
    throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
  }

  let format = formats['default'];
  if (typeof opts.format !== 'undefined') {
    if (!has.call(formats.formatters, opts.format)) {
      throw new TypeError('Unknown format option provided.');
    }
    format = opts.format;
  }
  const formatter = formats.formatters[format];

  let filter = defaults.filter;
  if (typeof opts.filter === 'function' || isArray(opts.filter)) {
    filter = opts.filter;
  }

  return {
    addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
    allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
    charset: charset,
    charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
    delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
    encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
    encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
    filter: filter,
    formatter: formatter,
    serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
    skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
    sort: typeof opts.sort === 'function' ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
  };
};

export default function(object, opts) {
  let obj = object;
  const options = normalizeStringifyOptions(opts);

  let objKeys;
  let filter;

  if (typeof options.filter === 'function') {
    filter = options.filter;
    obj = filter('', obj);
  } else if (isArray(options.filter)) {
    filter = options.filter;
    objKeys = filter;
  }

  const keys = [];

  if (typeof obj !== 'object' || obj === null) {
    return '';
  }

  let arrayFormat;
  if (opts && opts.arrayFormat in arrayPrefixGenerators) {
    arrayFormat = opts.arrayFormat;
  } else if (opts && 'indices' in opts) {
    arrayFormat = opts.indices ? 'indices' : 'repeat';
  } else {
    arrayFormat = 'indices';
  }

  const generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

  if (!objKeys) {
    objKeys = Object.keys(obj);
  }

  if (options.sort) {
    objKeys.sort(options.sort);
  }

  const len = objKeys.length;
  for (let i = 0; i < len; ++i) {
    const key = objKeys[i];

    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    pushToArray(keys, stringify(
      obj[key],
      key,
      generateArrayPrefix,
      options.strictNullHandling,
      options.skipNulls,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.formatter,
      options.encodeValuesOnly,
      options.charset
    ));
  }

  const joined = keys.join(options.delimiter);
  let prefix = options.addQueryPrefix === true ? '?' : '';

  if (options.charsetSentinel) {
    if (options.charset === 'iso-8859-1') {
      // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
      prefix += 'utf8=%26%2310003%3B&';
    } else {
      // encodeURIComponent('✓')
      prefix += 'utf8=%E2%9C%93&';
    }
  }

  return joined.length > 0 ? prefix + joined : '';
}
