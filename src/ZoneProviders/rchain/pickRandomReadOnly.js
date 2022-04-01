const fs = require('fs');
const { getConfig } = require('../../config');
const { getStore } = require('../../store');

const pickRandomReadOnly = () => {
  const store = getStore();
  const config = getConfig();

  const readOnlyIndex = Math.floor(
    Math.random() * store.httpUrlReadOnly.length
  );
  const r = store.httpUrlReadOnly[readOnlyIndex];

  if (!store.readOnlyOptions) {
    store.readOnlyOptions = {};
  }

  if (store.readOnlyOptions[r]) {
    return store.readOnlyOptions[r];
  }

  store.readOnlyOptions[r] = {
    url: r,
  };

  if (
    r.startsWith('https://') &&
    config.rchainReadOnlyCertificateFilename
  ) {
    const cert = fs.readFileSync(
      config.rchainReadOnlyCertificateFilename,
      'utf8'
    );
    store.readOnlyOptions[r].ca = [cert];
  }
  return store.readOnlyOptions[r];
};

module.exports = {
  pickRandomReadOnly,
};
