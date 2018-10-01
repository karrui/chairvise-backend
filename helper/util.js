const getSortedArrayFromMapUsingCount = input => {
  const sortable = [];
  for (const element in input) {
    sortable.push([element, input[element]]);
  }
  sortable.sort((a, b) => b[1] - a[1]);

  return sortable;
};

const getSortedArrayFromMapUsingKey = input => {
  const sortable = [];
  for (const element in input) {
    sortable.push([element, input[element]]);
  }
  sortable.sort((a, b) => a[0].localeCompare(b[0]));

  return sortable;
};

export default {
  getSortedArrayFromMapUsingCount,
  getSortedArrayFromMapUsingKey
};
