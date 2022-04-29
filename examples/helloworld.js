const https = require('https');
const express = require('express');
const fs = require('fs');
const { blake2b } = require('blakejs');

const elliptic = require('elliptic');

const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAxro0HiS9+VRGS4FRpD3rNIJyjmV3pjW9nBxjwrxd2dl1OHGX
kmCsEuaXSD/huGZ6w+0NwfDb/j/x+wSfzu48mZgtHjVx+/oMwsfvZMXoaY51i6rp
GcHxXlUvVSLRrFkdOAMUWF092xGJRfs9w4UtNDx3Ad9c8CFpoS+bYx2FuN7o0Ji4
DCxFuRM3qWkuKex/Q7kcvsLxCSZQIk3O8bLhu6ouZRKP4ncVYaItSDUPgFWA1FvY
bu05HiZbdpjqviB0iPS3f+w58Feg+DmLps1LvTemC2cBvIqDYDzXfhio/BPWXTEt
VaJWjbkIgk505WdDv4xVcwj47JEsr7CCe0mCLQIDAQABAoIBAQCa/I25FJ603W0V
Zf3uQfw2L6Z4N9pg3njKT7neHlpzlI0/QBgeKRcKhpxl1KyNzB7ivvaD0v1ABU8L
nkekc1j/0RcfAD+tbQ6WuqeRyGfCK0CxdNHnLMK592W62DT+XWHUVVKAt/eN6tdM
pO0+l5bxrlaCN1mcTfK7qw1c96Fa092QZ/nN4DH1nk6NLJL2v11EX1w5eqOAOj4v
0QMDt3fQ/2XdD3EBNmV2FWH96YqStiU9V5xISy84LhmxJ4qcsi6JMwshmzfNb65s
BMALS29W0Ppi/moP/BWRYSHDypACtWXrSmMVca0uHf/5u6KgC2lZqtTP2m85dpfK
OxGivo5hAoGBAPOnhmusGH30fO1Iat3NP4siE4DUudtGGC5ew2H8D2IH3Z+Ug3mM
ARiRyHjCkwxgI2z7WLS+C5NCBqidFVd2GE2aP+9zKpEZalXH7yJ/NQDG+cF7GNel
KiXHcKvVuDVFk5jW2GSQUznTW0RidF3p/Tt14NhaCQ1u46lUmyqhDXdPAoGBANDL
7HZWkiiLkVdYAJjeujyEZLwLlC3eeT5xXQ2xMEh8L/l0p4n5JLwJxpeJJCdJYgAJ
RV14gdh9dFrSdKadCLJlLpGxcqL8eVrqy5zNn3OzXYBKnx5HbaQCtMErimKTu/CW
0Ecb1X10jOWLDuDzaQYO/PTPW1yV+G+EgBE41g/DAoGBAJL/qB5/xor/HPu/LBJD
CSo01dVtAfBjuqUHMROFkfZPzoq/fA6xw9uB4JPSuArIWbcfcSYiXjNqqz/A/aY1
rnXrMNWTAsRls/yq0gBbBKxCX142mQdJM0N1rulM2ITzRBf6zrTlSgDiHfcE+zXJ
vKjJ9mww7bM4CowXakHuxoQLAoGAb7yxzqKFlS0bmqJ9r1GCWOCBCCEqK2HjgIcq
RSmNrTzIb7b98dhi0D5rCK1bq6qZx2sus9bJphF9Mx1tT7y56r47LbzInHCAgScl
z8Q6kLBsWTuV655ODndkQ/wJErf828PZsjQzC/BTdoP0cm3Qxm0+8cQGIIYhbYx6
/Lxt0gECgYEAyPGLEF2IlL3Y+tAcrvpQ6yOCcd6It5UWXkLiYIEnPoDRUbx+mvJg
FL7Xw9R4R6JOSV1ow4cRumyBUOUg8Sn6hJrkFthf6Zv9NKOWOCDN0vQIjuc7NowU
Tj4FJXDDfHXd3liB2SzfQ1TiqsS5Zdf6kK0jgAUlRnT/iqZsZWyNgYs=
-----END RSA PRIVATE KEY-----`

const cert = `-----BEGIN CERTIFICATE-----
MIIC4zCCAcugAwIBAgIUc6Dw/cUkATwEAwqUr1Uv9+hO5YEwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTIyMDQyNzEzMzUwOFoYDzIxMDQw
NjE2MTMzNTA4WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQDGujQeJL35VEZLgVGkPes0gnKOZXemNb2cHGPCvF3Z
2XU4cZeSYKwS5pdIP+G4ZnrD7Q3B8Nv+P/H7BJ/O7jyZmC0eNXH7+gzCx+9kxehp
jnWLqukZwfFeVS9VItGsWR04AxRYXT3bEYlF+z3DhS00PHcB31zwIWmhL5tjHYW4
3ujQmLgMLEW5EzepaS4p7H9DuRy+wvEJJlAiTc7xsuG7qi5lEo/idxVhoi1INQ+A
VYDUW9hu7TkeJlt2mOq+IHSI9Ld/7DnwV6D4OYumzUu9N6YLZwG8ioNgPNd+GKj8
E9ZdMS1VolaNuQiCTnTlZ0O/jFVzCPjskSyvsIJ7SYItAgMBAAGjKzApMCcGA1Ud
EQQgMB6CCmhlbGxvd29ybGSCEGhlbGxvd29ybGQuZGFwcHkwDQYJKoZIhvcNAQEL
BQADggEBAAyC5vWxhLO2P7pZp0UABWDnvLHSe3UzgNF/1F76FHT9s96gGTwx6AGM
SbMMCMp03zBEguEpPyNqfWX1e91Tts8nQiStqL4V5ldRD0A2RH06ttz9UmgkpB1o
2F8ACFKdIjSIiAglO5CuAYK4/+5TrZKKQVgmKMLxUEyhQoc+8zkm7uGN+vY3THop
ZDpBS+BgQniikcFb1tOROGgs0AMhZMOKBemDpMLOI7bPpNnRLycKcHAw/u+IwVUO
F5LaA8bFF1kLvrmwnBdWOBDK6e/Ce5MOdbf5/UbjIpQnSCWw1xr5A78Svtvi6aD2
JrcBStT84la2mWoukyK/iUXhtYJ14c8=
-----END CERTIFICATE-----`;

const app = express();

app.get('/helloworldimg.png', (req, res) => {
  res.setHeader('Content-Type', "image/png");
  res.send(fs.readFileSync(__dirname + '/helloworldimg.png'))
});

let challenges = {};
let sessions = {};

app.post('/blitz-authenticate', (req, res) => {
  try {
    const payload = JSON.parse(req.headers['blitz-authentication-response']);
    if (payload.nonce && challenges[payload.nonce]) {
      const e = new elliptic.ec("secp256k1");
      const bufferToSign = Buffer.from(JSON.stringify(challenges[payload.nonce].challenge), "utf8");
      const uInt8Array = new Uint8Array(bufferToSign);
      const blake2bHash = blake2b(uInt8Array, 0, 32);
  
      const keyPair = e.keyFromPublic(payload.publicKey, 'hex');
      if (e.verify(Buffer.from(blake2bHash), payload.signature, keyPair, "hex")) {
        res.setHeader('set-cookie', `session=${payload.nonce}; Max-Age=10000; SameSite=Lax; HttpOnly; Secure;`);
        sessions[payload.nonce] = 'ok';
        console.log('connected !');
        res.redirect("https://helloworld.dappy:3005/connected");
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(403);
    }
  } catch (err) {
    res.sendStatus(403);
  }
});
app.get('/connected', (req, res) => {
  res.send('<html>connected</html>')
});

app.get('/login', (req, res) => {
  const nonce = "" + (Math.random() * 1000000 * new Date().getTime());
  res.setHeader('Blitz-Authentication', JSON.stringify({
    "version": 1,
    "host": "helloworld.dappy:3005",
    "nonce": nonce
  }));

  challenges[nonce] = {
    date: new Date().toISOString(),
    challenge: {
      "version": 1,
      "host": "helloworld.dappy:3005",
      "nonce": nonce
    }
  };

  setTimeout(() => {
    res.send('<html>login</html>')
  }, 6000);

});

app.get('*', (req, res) => {
  res.send(fs.readFileSync(__dirname + '/helloworld.html', 'utf8'))
});

const options = {
  key,
  cert,
  minVersion: 'TLSv1.3',
  cipher: 'TLS_AES_256_GCM_SHA384',
};
const serverHttps = https.createServer(options, app);

serverHttps.listen(3005)
console.log("(hello world) listenning on 127.0.0.1:3005")