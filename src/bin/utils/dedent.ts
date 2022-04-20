export function dedent(strs: TemplateStringsArray, ...values: Array<string>) {
  let result = '';
  for (let i = 0; i < strs.length; i += 1) {
    result += strs[i]
      // join lines when there is a suppressed newline
      .replace(/\\\n[ \t]*/g, '')
      // handle escaped backticks
      .replace(/\\`/g, '`');

    if (i < values.length) {
      result += values[i];
    }
  }

  const lines = result.split('\n');
  let mindent: number | null = null;
  lines.forEach((l) => {
    const m = l.match(/^(\s+)\S+/);
    if (m) {
      const indent = m[1].length;
      if (!mindent) {
        mindent = indent;
      } else {
        mindent = Math.min(mindent, indent);
      }
    }
  });

  // let result = '';
  if (mindent !== null) {
    const m = mindent;
    result = lines.map((l) => (l[0] === ' ' ? l.slice(m) : l)).join('\n');
  }
  return result;
}
