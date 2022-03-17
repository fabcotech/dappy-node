const initStore = () => ({
  dappyNodeVersion: '0.2.8',
  dappyBrowserMinVersion: process.env.DAPPY_BROWSER_MIN_VERSION,
  dappyBrowserDownloadLink: process.env.DAPPY_BROWSER_DOWNLOAD_LINK,
  namePrice: null,
  caching: parseInt(process.env.DAPPY_NODE_CACHING, 10),
  useCache: !!parseInt(process.env.DAPPY_NODE_CACHING, 10),
});

module.exports = {
  initStore,
};
