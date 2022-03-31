const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const fs = require('fs');

const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEpgIBAAKCAQEAtBrm3lKzdSc+kxQCH/5Fs53Aj61pPFcNiqvQcoQZmJHpEkCK
PfJUYbYOADni3ZhJVZzPPYK9EJV8GMl2SxCmk8useoDirsGmh1TT4v9uRw/DFnlA
XO/W41253D7kYntw2PzBjWfYkUPHZT3hsomOPkjwYu0ljKWdyOYTI7EG5zLO6K8x
2lVsC4jT5f+knOrFNEHRunoueqCgup8I8JHl8mTNRhffkxVVxJdYYGuERnC0Uh3g
MdLXfkHcZXOT1qiFEvFcdCzI7FxXnifPbaWvdIelH7UjZXSQ20RXP88Vfd7KeQwq
phFJIOpt7ZBFo0uau4QHBBsJ8t3tjCfDDjw5+wIDAQABAoIBAQCm8yD7CVJM0LoS
gEOQAJX/78Vl6etZAaEN4EJzRLytTuPsBWOgFJffk3DbCM2hd97Su27np982FjtY
hrde0ep3qh8R15NJRzzkyd831msU+ClxFahx/ekGDgWRgcMW/zIWEgYg3BhGX7vf
v0MNyrDOT7J1ITrja0odxhgLx7eMa2B/z237WL/QtTsj9JMoB3/4ml8pnj0WfIX/
uwJ+1/PPxg+0GHS3afdou+MnEGqOB8q/yxng0MEetD+o/Qdq89QT+a6ytXecoPPI
wiEWEvc2FU/B/IPFw3guRP/VBbqjPfBlG9AYZ7fQy7omjbmnrZdMPfgUTzMxNdpl
JYzT2tNRAoGBANkzBRLtVptxKLs31qS3XAk/NjkOYfRRted53bkXy1ikRSZqsLgi
qw7bHna087C6TuDEBjpdLzZGmBdRrSzBscQPHI/AOahMn1xwMir4wMi3aVj8iJHt
4nna3amKEzRLuRgB1tzqqOqm/2eUBLPRu6jauofidMpsVou4xCRp0mLPAoGBANRH
fF28exbI/pxNtiWTX58s2p0qFktQ70F/qEejd3pVvjn70yFFOAag+kbed7XAqYwf
B28IP940YQBHU3oamvow9KeRTTRR3Hu1HpYRtqJ8CQaeMBNGEWC/XaSxHgIT6eTI
5DAKE0VRCS0XkCL+PgD9eqJ12z7TAiVTUVbqB7EVAoGBAIbBrdM5Z7OXeLL3iPe3
P6YJDwZFUyb3j0mnhZYyGhrMCI82QKBt+f2Em5kA2fT7ErdHR6nsaL9e+zv0k+Ih
5r4CtjDGDb/KklES1z1sCog9q2HnhIAtvIbn8QEgRpv6o0Mu2PVFrjmwFORZpLVA
WhMAahymttlkcCnOH/uLoFlnAoGBAIl7hut6n8mhAW2f0wFBEmQX+7pgQLIkx+AG
2qkTENV1ZM9O7m2U0/VPGuj9OlDHZ8etbPYXRK4YBF7W0xS42HiDbmB8daEWB5ND
OXz+GefgJ0RW/VHuRmD/b5mzcHjuBsS66zbFv7dcBXJj2WEggm3HvT4s0IM+zBv6
eyqsRbEFAoGBAMlNBknj87GoO55SAJ8FnNenBCXuOFIDYmnYd/y48NFN6evAupsA
glV0o9zeQX2Ljwcgb8tm4aG5ZDBSfLpEboKKYeC896/HqpFSe1jeNJQXVWsd8OlK
9xAMX3tXDsq9++UnjeTHYqdYETx1z4Z2QQURJ0PQqHz2cAhZ02ILhjZX
-----END RSA PRIVATE KEY-----`

const cert = `-----BEGIN CERTIFICATE-----
MIIC4zCCAcugAwIBAgIUZ1pNf/I0rVimScw0zLdqH9WDzbgwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTIyMDMzMTA5MDEzN1oYDzIxMDQw
NTIwMDkwMTM3WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC0GubeUrN1Jz6TFAIf/kWzncCPrWk8Vw2Kq9ByhBmY
kekSQIo98lRhtg4AOeLdmElVnM89gr0QlXwYyXZLEKaTy6x6gOKuwaaHVNPi/25H
D8MWeUBc79bjXbncPuRie3DY/MGNZ9iRQ8dlPeGyiY4+SPBi7SWMpZ3I5hMjsQbn
Ms7orzHaVWwLiNPl/6Sc6sU0QdG6ei56oKC6nwjwkeXyZM1GF9+TFVXEl1hga4RG
cLRSHeAx0td+Qdxlc5PWqIUS8Vx0LMjsXFeeJ89tpa90h6UftSNldJDbRFc/zxV9
3sp5DCqmEUkg6m3tkEWjS5q7hAcEGwny3e2MJ8MOPDn7AgMBAAGjKzApMCcGA1Ud
EQQgMB6CCmhlbGxvd29ybGSCEGhlbGxvd29ybGQuZGFwcHkwDQYJKoZIhvcNAQEL
BQADggEBAGxhZtS8Y76b7WFc9juntJg/L/OvsgiLaVimmUtHVKyvsW89y+A41Pdc
2uMLriXCFUnxxchG2xku5qr+Ll3aMNJyBtPYQBH2wj259vm66lgyXk92/p+YA+eO
r3G6dzZeC16PSUam/1y6k8EwZQtXv1vHhdFw7GFUmhJh8sTnmIiwGAznE+3/soe5
mtLAu+2oafQBrqi7iWkMr+DSKrEniaxcVh5QBBipcPV3p6fH3z8Eu/peQgQ20GXq
W/Natjl3y/7S1cUQFjdqKZXL/GsqnADJ/7wLlkmpSSVN+Zn46F5NqefQLUUsDx35
C9qnfba2nLtOvu5QdD+be5iLXCuS6/g=
-----END CERTIFICATE-----`;

const app = express();

app.get('*', (req, res) => {
  res.send("<html><body style=\"display:flex;justify-content:center;aligh-items:center;background:#fff;height:100vh;\">Hello world !</body></html>")
});

const options = {
  key,
  cert,
  minVersion: 'TLSv1.3',
  cipher: 'TLS_AES_256_GCM_SHA384',
};
const serverHttps = https.createServer(options, app);

serverHttps.listen(3005)
console.log("listenning on 127.0.0.1:3005")