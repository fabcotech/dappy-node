const Ajv = require('ajv');

const ajv = new Ajv();

const schema = {
  schemaId: 'get-contract-logs',
  type: 'object',
  properties: {
    contract: { type: 'string' },
    size: { type: 'number' },
    offset: { type: 'number' },
  },
  required: ['contract'],
};

const getContractLogsHandler = (zRange, log) => async (params, res) => {
  const validate = ajv.compile(schema);

  if (!validate(params)) {
    res.status(400);
    res.send('bad request');
    return;
  }

  let { size = 100, offset = 0 } = params;
  const { contract } = params;

  size = parseInt(size, 10);
  offset = parseInt(offset, 10);

  if (size <= 0) size = 1;
  if (size > 100) size = 100;
  if (offset < 0) offset = 0;

  try {
    const contractLogs = await zRange(
      `logs:${contract}`,
      offset,
      offset + size - 1,
      'rev',
    );

    res.send({
      data: contractLogs,
      success: true,
    });
  } catch (err) {
    res.status(500);
    res.send('internal server error');
    log(err, 'error');
  }
};

module.exports = {
  getContractLogsHandler,
};
