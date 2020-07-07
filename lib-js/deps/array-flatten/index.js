/**
 * Flatten an array indefinitely.
 */
export function flatten(array) {
  const result = [];
  $flatten(array, result);
  return result;
}
/**
 * Internal flatten function recursively passes `result`.
 */
function $flatten(array, result) {
  const len = array.length;
  for (let i = 0; i < len; ++i) {
    const value = array[i];
    if (Array.isArray(value)) {
      $flatten(value, result);
    }
    else {
      result.push(value);
    }
  }
}
