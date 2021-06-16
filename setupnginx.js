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
  !process.env.CLUSTER_DOMAIN_NAME ||
  typeof process.env.CLUSTER_DOMAIN_NAME !== 'string'
) {
  throw new Error('Missing env CLUSTER_DOMAIN_NAME');
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
  listen 40400 ssl http2;
  server_name ~^(?P<name>aarnode-[0-9]+)\\.${
    process.env.RCHAIN_NETWORK
  }\\.${process.env.CLUSTER_DOMAIN_NAME.replace('.', '\\.')}$;
  access_log /etc/nginx/access-40400.log;
  error_log  /etc/nginx/error-40400.log;

  ssl_protocols       TLSv1.2 TLSv1.3;
  ssl_certificate     /ssl/rnode.crt;
  ssl_certificate_key /ssl/rnode.key;

  client_max_body_size 10M;

  location / {
    grpc_pass grpc://aarnode-0.rnode.default.svc.cluster.local:40400;
    grpc_set_header ssl-client-verify      $ssl_client_verify;
    grpc_set_header ssl-client-subject-dn  $ssl_client_s_dn;
    grpc_set_header ssl-client-issuer-dn   $ssl_client_i_dn;

    # grpc_pass grpc://${process.env.RNODE_SERVICE_HOST}:40400;
    # grpc_set_header Host aarnode-0.${process.env.RCHAIN_NETWORK}.${
  process.env.CLUSTER_DOMAIN_NAME
};
  }
}

server {
  listen 40401 http2;
  server_name ~^(?P<name>aarnode-[0-9]+)\\.${
    process.env.RCHAIN_NETWORK
  }\\.${process.env.CLUSTER_DOMAIN_NAME.replace('.', '\\.')}$;
  access_log /etc/nginx/access-40401.log;
  error_log  /etc/nginx/error-40401.log;

  location / {
    grpc_pass grpc://aarnode-0.rnode.default.svc.cluster.local:40401;
    grpc_set_header ssl-client-verify      $ssl_client_verify;
    grpc_set_header ssl-client-subject-dn  $ssl_client_s_dn;
    grpc_set_header ssl-client-issuer-dn   $ssl_client_i_dn;

    # grpc_pass grpc://${process.env.RNODE_SERVICE_HOST}:40401;
    # grpc_set_header Host aarnode-0.${process.env.RCHAIN_NETWORK}.${
  process.env.CLUSTER_DOMAIN_NAME
};
  }
}

server {
  listen 40404 http2;
  server_name ~^(?P<name>aarnode-[0-9]+)\\.${
    process.env.RCHAIN_NETWORK
  }\\.${process.env.CLUSTER_DOMAIN_NAME.replace('.', '\\.')}$;
  access_log /etc/nginx/access-40404.log;
  error_log  /etc/nginx/error-40404.log;

  location / {
    proxy_pass http://aarnode-0.rnode.default.svc.cluster.local:40404;
    # proxy_pass http://${process.env.RNODE_SERVICE_HOST}:40404;
  }
}

server {
  listen 40403;
  server_name ~^(?P<name>aarnode-[0-9]+)\\.${
    process.env.RCHAIN_NETWORK
  }\\.${process.env.CLUSTER_DOMAIN_NAME.replace('.', '\\.')}$;
  access_log /etc/nginx/access-40403.log;
  error_log  /etc/nginx/error-40403.log;
  location / {
    proxy_pass http://aarnode-0.rnode.default.svc.cluster.local:40403;
    # proxy_pass http://${process.env.RNODE_SERVICE_HOST}:40403;
    proxy_set_header Host aarnode-0.${process.env.RCHAIN_NETWORK}.${
  process.env.CLUSTER_DOMAIN_NAME
};
  }
}

server {
    listen 80 default_server;
    server_name ${process.env.DAPPY_NETWORK};
    location / {
      limit_req zone=req_limit_per_ip burst=10 nodelay;
      limit_conn conn_limit_per_ip 30;
      proxy_pass http://${process.env.NODEJS_SERVICE_HOST}:${
  process.env.NODEJS_SERVICE_PORT_3001
};
    }
}

server {
    listen 443 ssl http2;
    server_name ${process.env.DAPPY_NETWORK};
    location / {
      limit_req zone=req_limit_per_ip burst=10 nodelay;
      limit_conn conn_limit_per_ip 30;
      proxy_pass http://${process.env.NODEJS_SERVICE_HOST}:${
  process.env.NODEJS_SERVICE_PORT_3002
};
    }
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;

    ssl_certificate /ssl/dappynode.crt;
    ssl_certificate_key /ssl/dappynode.key;
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
