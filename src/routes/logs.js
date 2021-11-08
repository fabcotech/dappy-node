const logs = (zRevRange, log) => async ({contract, size = 100, offset = 0}, res) => {
  if (isNaN(parseInt(size)) || isNaN(parseInt(offset))) {
    res.status(400);
    res.send('bad request');
    return;
  }
  
  size = parseInt(size);
  offset = parseInt(offset);

  if (size <= 0) size = 1; 
  if (size > 100) size = 100;
  if (offset < 0) offset = 0;

  try {
    const contractLogs = await zRevRange([`logs:${contract}`, offset, (offset + size-1)]);
    res.send(contractLogs);
  }
  catch (err) {
    res.status(500);
    res.send('internal server error')
    log(err, 'error');
  }
}

module.exports = {
  logs 
};