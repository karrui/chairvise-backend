export const getSortedArrayFromMapUsingCount = input => {
  const sortable = [];
  for (const element in input) {
    sortable.push([element, input[element]]);
  }
  sortable.sort((a, b) => b[1] - a[1]);

  return sortable;
};

export const getSortedArrayFromMapUsingKey = input => {
  const sortable = [];
  for (const element in input) {
    sortable.push([element, input[element]]);
  }
  sortable.sort((a, b) => a[0].localeCompare(b[0]));

  return sortable;
};

export const fillRange = (start, stop, interval = 1) => {
  const result = [];
  while (start <= stop) {
    result.push(start);
    start = +(start + interval).toFixed(2);
  }
  return result;
};

export const setArrayValuesToZero = array => array.map(x => 0);

export const sum = (a, b) => a + b;

export default {
  getSortedArrayFromMapUsingCount,
  getSortedArrayFromMapUsingKey,
  fillRange,
  sum
};
