/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const log = (a, level = 'info') => {
  if (level === 'warning') {
    console.log('\x1b[33m%s\x1b[0m', `${new Date().toISOString()} [WARN] ${a}`);
    let warnings = '';
    try {
      warnings = fs.readFileSync(
        path.join(__dirname, '../logs/warnings.txt'),
        'utf8',
      );
    } catch (err) {
      // do nothing
    }
    warnings += `${new Date().toISOString()} ${a}\n`;
    fs.writeFileSync(
      path.join(__dirname, '../logs/warnings.txt'),
      warnings,
      'utf8',
    );
  } else if (level === 'error') {
    let errors = '';
    try {
      errors = fs.readFileSync(
        path.join(__dirname, '../logs/errors.txt'),
        'utf8',
      );
    } catch (err) {
      // do nothing
    }
    errors += `${new Date().toISOString()} ${a}\n`;
    fs.writeFileSync(
      path.join(__dirname, '../logs/errors.txt'),
      errors,
      'utf8',
    );
    console.log(
      '\x1b[31m%s\x1b[0m',
      `${new Date().toISOString()} [ERROR] ${a}`,
    );
  } else {
    console.log(new Date().toISOString(), a);
  }
};

module.exports = {
  log,
};
