const fs = require('fs');
const os = require('os');
const path = require('path');

const DAPPY_CONFIG_FILE_NAME = 'dappyrc'
const envFilePath = path.resolve('./', DAPPY_CONFIG_FILE_NAME);

const createConfigFileIfNotExists = () => fs.closeSync(fs.openSync(envFilePath, 'a'))

const readEnvVars = () => fs.readFileSync(envFilePath, 'utf-8').split(os.EOL);

const getEnvValue = (key) => {
  // find the line that contains the key (exact match)
  const matchedLine = readEnvVars().find((line) => line.split('=')[0] === key);
  // split the line (delimiter is '=') and return the item at index 2
  return matchedLine !== undefined ? matchedLine.split('=')[1] : null;
};

const setEnvValue = (key, value) => {
  const envVars = readEnvVars();
  const targetLine = envVars.find((line) => line.split('=')[0] === key);
  if (targetLine !== undefined) {
    // update existing line
    const targetLineIndex = envVars.indexOf(targetLine);
    // replace the key/value with the new value
    envVars.splice(targetLineIndex, 1, `${key}=${value}`);
  } else {
    // create new key value
    envVars.push(`${key}=${value}`);
  }
  // write everything back to the file system
  fs.writeFileSync(envFilePath, envVars.join(os.EOL), {
    flag: 'w+'
  });
};

const mustBeUrl = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${value} is not a valid url`);
  }
  return value;
};

const mustBeNotEmptyString = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
  if (typeof value !== 'string') {
    throw new Error(`${value} is not a valid string`);
  }
  if (value.length === 0) {
    throw new Error(`${value} is not a valid string`);
  }
  return value;
};

module.exports = {
  getEnvValue,
  setEnvValue,
  mustBeNotEmptyString,
  mustBeUrl,
  createConfigFileIfNotExists,
  DAPPY_CONFIG_FILE_NAME,
};
