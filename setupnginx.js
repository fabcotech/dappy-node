const fs = require('fs');

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
  !process.env.NGINX_SERVER_NAME ||
  typeof process.env.NGINX_SERVER_NAME !== 'string'
) {
  throw new Error('Missing env NGINX_SERVER_NAME');
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
    server_name ${process.env.NGINX_SERVER_NAME};
    location / {
      limit_req zone=req_limit_per_ip burst=10 nodelay;
      limit_conn conn_limit_per_ip 30;
      proxy_pass http://${process.env.NODEJS_SERVICE_HOST}:${process.env.NODEJS_SERVICE_PORT_3001};
    }
}

server {
    listen 443 ssl http2;
    server_name ${process.env.NGINX_SERVER_NAME};
    location / {
      limit_req zone=req_limit_per_ip burst=10 nodelay;
      limit_conn conn_limit_per_ip 30;
      proxy_pass http://${process.env.NODEJS_SERVICE_HOST}:${process.env.NODEJS_SERVICE_PORT_3002};
    }
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    include /etc/nginx/snippets/sslparams.conf;
}
`;

fs.writeFileSync('/etc/nginx/conf.d/dappy.conf', nginxConfigFileHttp, 'utf8');

console.log('/etc/nginx/conf.d/dappy.conf nginx config file created !');
