export const SEPARATOR = '    ';

export function getRowLength(lines: string[][]): number[] {
  const rowLengths: number[] = new Array(lines[0].length).fill(0);
  for (let lIndex = 0; lIndex < lines.length; lIndex += 1) {
    for (let rIndex = 0; rIndex < lines[lIndex].length; rIndex += 1) {
      if (lines[lIndex][rIndex].length > rowLengths[rIndex]) {
        rowLengths[rIndex] = lines[lIndex][rIndex].length;
      }
    }
  }
  return rowLengths;
}

export function suffixIfNecessary(str: string, length: number): string {
  if (str.length < length) {
    return `${str}${' '.repeat(length - str.length)}`;
  }
  return str;
}

export function asciiTable(lines: string[][]) {
  const rowLengths = getRowLength(lines);
  const output: string[] = [];
  for (let lIndex = 0; lIndex < lines.length; lIndex += 1) {
    let outputLine = '';
    for (let rIndex = 0; rIndex < lines[lIndex].length; rIndex += 1) {
      outputLine += suffixIfNecessary(
        lines[lIndex][rIndex],
        rowLengths[rIndex],
      );
      if (rIndex < lines[lIndex].length - 1) {
        outputLine += SEPARATOR;
      }
    }
    output.push(outputLine);
  }
  return output.join('\n');
}
