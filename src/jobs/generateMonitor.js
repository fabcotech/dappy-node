const fs = require('fs');

module.exports.generateMonitor = async () => {
  const data = {};
  const a = fs.readdirSync('./logs');
  a.forEach((x) => {
    if (x.startsWith('dappy-')) {
      const content = fs.readFileSync('./logs/' + x, 'utf8');
      data[x] = content;
    }
  });

  let html = fs.readFileSync('./monitorexample.html', 'utf8');
  html = html.replace('$DATA$', JSON.stringify(data));
  fs.writeFileSync('./www/monitor.html', html);
};
