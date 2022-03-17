const getNodes = (store) => (req, res) => {
  if (store.nodes) {
    res.json({
      data: store.nodes,
    });
  } else {
    res.status(404).end();
  }
};

module.exports = {
  getNodes,
};
