import { describe, it, expect } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('joins headers and rows with CRLF', () => {
    const csv = toCsv(['A', 'B'], [['1', '2'], ['3', '4']]);
    expect(csv).toBe('A,B\r\n1,2\r\n3,4');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(toCsv(['x'], [['a,b']])).toBe('x\r\n"a,b"');
    expect(toCsv(['x'], [['he said "hi"']])).toBe('x\r\n"he said ""hi"""');
    expect(toCsv(['x'], [['line1\nline2']])).toBe('x\r\n"line1\nline2"');
  });

  it('renders null and undefined as empty cells', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,');
  });

  it('handles an empty row set', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b');
  });

  it('neutralizes formula-injection cells (=, +, -, @)', () => {
    expect(toCsv(['x'], [['=SUM(A1:A2)']])).toBe("x\r\n'=SUM(A1:A2)");
    expect(toCsv(['x'], [['+1']])).toBe("x\r\n'+1");
    expect(toCsv(['x'], [['-1+2']])).toBe("x\r\n'-1+2");
    expect(toCsv(['x'], [['@cmd']])).toBe("x\r\n'@cmd");
  });

  it('quotes and prefixes a dangerous cell that also contains a comma', () => {
    expect(toCsv(['x'], [['=1,2']])).toBe('x\r\n"\'=1,2"');
  });

  it('leaves safe leading characters untouched', () => {
    expect(toCsv(['x'], [['Acme Corp']])).toBe('x\r\nAcme Corp');
  });
});
