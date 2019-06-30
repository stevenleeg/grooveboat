export const lpad = (number, padString, length) => {
  if (Number.isNaN(number)) {
    number = 0;
  }

  let str = number.toString();
  while (str.length < length) {
    str = padString + str;
  }
  return str;
};
