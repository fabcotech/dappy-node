const fs = require('fs');

const resolvConf = fs.readFileSync('/etc/resolv.conf', 'utf8');

let NS_RESOLVER_IP = '';
resolvConf.split('\n').forEach((l) => {
  console.log(l);
  if (l.startsWith('nameserver')) {
    NS_RESOLVER_IP = l.slice(11);
  }
});

if (
  !/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(NS_RESOLVER_IP)
) {
  console.log('IP of coreDNS not found in /etc/resolv.conf file');
}
console.log(
  'IP of coreDNS resolver found in /etc/resolv.conf : ' + NS_RESOLVER_IP
);

if (
  !process.env.NODEJS_SERVICE_PORT_3002 ||
  typeof process.env.NODEJS_SERVICE_PORT_3002 !== 'string'
) {
  throw new Error('Missing env NODEJS_SERVICE_PORT_3002');
}
if (
  !process.env.NODEJS_SERVICE_PORT_3001 ||
  typeof process.env.NODEJS_SERVICE_PORT_3001 !== 'string'
) {
  throw new Error('Missing env NODEJS_SERVICE_PORT_3001');
}
if (
  !process.env.DAPPY_NETWORK ||
  typeof process.env.DAPPY_NETWORK !== 'string'
) {
  throw new Error('Missing env DAPPY_NETWORK');
}
if (
  !process.env.NODEJS_SERVICE_HOST ||
  typeof process.env.NODEJS_SERVICE_HOST !== 'string'
) {
  throw new Error('Missing env NODEJS_SERVICE_HOST');
}

const nginxConfigFileHttp = `
limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=2r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;

server {
    listen 80 default_server;
    location / {
      limit_req zone=req_limit_per_ip burst=10 nodelay;
      limit_conn conn_limit_per_ip 30;
      proxy_pass http://${process.env.NODEJS_SERVICE_HOST}:${process.env.NODEJS_SERVICE_PORT_3001};
    }
}

server {
    listen 443 ssl http2;
    location / {
      limit_req zone=req_limit_per_ip burst=10 nodelay;
      limit_conn conn_limit_per_ip 30;
      proxy_pass http://${process.env.NODEJS_SERVICE_HOST}:${process.env.NODEJS_SERVICE_PORT_3002};
    }
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;

    ssl_certificate /ssl/tls.crt;
    ssl_certificate_key /ssl/tls.key;
    include /etc/nginx/snippets/sslparams.conf;
}
`;

fs.writeFileSync('/etc/nginx/conf.d/dappy.conf', nginxConfigFileHttp, 'utf8');

console.log('/etc/nginx/conf.d/dappy.conf nginx config file created !');

const nginxConf = fs.readFileSync('/etc/nginx/nginx.conf', 'utf8');

let nginxConfModified = '';
nginxConf.split('\n').forEach((l) => {
  console.log(l);
  if (l.startsWith('http {')) {
    nginxConfModified += l + '\n';
    nginxConfModified += `    resolver ${NS_RESOLVER_IP};\n`;
    nginxConfModified += '    resolver_timeout 10s;\n';
  } else {
    nginxConfModified += l + '\n';
  }
});

fs.writeFileSync('/etc/nginx/nginx.conf', nginxConfModified, 'utf8');
console.log('---');
console.log(nginxConfigFileHttp);
console.log('---');

console.log('/etc/nginx/nginx.conf rewritten with correct resolver config  !');
