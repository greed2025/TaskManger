const { isValidDate, normalizeDateString, parseCSVLine } = require('../js/utils.js');

describe('isValidDate', () => {
  test('valid date returns true', () => {
    expect(isValidDate('2024-05-30')).toBe(true);
  });
  test('invalid month returns false', () => {
    expect(isValidDate('2024-13-01')).toBe(false);
  });
});

describe('normalizeDateString', () => {
  test('converts slash format to hyphen format', () => {
    expect(normalizeDateString('2024/5/3')).toBe('2024-05-03');
  });
});

describe('parseCSVLine', () => {
  test('parses quoted CSV line', () => {
    const line = '"Task","2024-05-01","2024-05-02",high,10';
    expect(parseCSVLine(line)).toEqual(['Task','2024-05-01','2024-05-02','high','10']);
  });
});
