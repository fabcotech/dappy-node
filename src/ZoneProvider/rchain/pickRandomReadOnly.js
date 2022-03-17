const fs = require('fs');

const pickRandomReadOnly = (store) => {
  const readOnlyIndex = Math.floor(Math.random() * store.httpUrlReadOnly.length);
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

  if (r.startsWith('https://') && process.env.READ_ONLY_CERTIFICATE_PATH) {
    const cert = fs.readFileSync(
      process.env.READ_ONLY_CERTIFICATE_PATH,
      'utf8',
    );
    store.readOnlyOptions[r].ca = [cert];
  }
  return store.readOnlyOptions[r];
};

module.exports = {
  pickRandomReadOnly,
};
