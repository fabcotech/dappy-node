const ping = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({ data: 'pong' }));
  res.end();
};

module.exports = {
  ping,
};
