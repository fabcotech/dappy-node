const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const fs = require('fs');

const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAqIIdiXSuoC8TSiCiekkSonPdQ6GYkmhqEbQERstGnhUBuure
CsFvLKu4/w1lY9Q3N+gY1LLj69fuFfzCmpeR0FLGMLQzWVWhtgMnvZwaRCqXQuj2
E99ZLQuM97pT1e9hPNFKRuz04jcxbJ6W2t40jv9QecC2th6YOAoHlNcOCQsPg0GG
8DHbOyvmceDfUBeZbMmJEeLa3PqUmQY5X7Pyc1b/kXdFYzL13CJKOj0VD3R+Igvj
veBNOrsZQuMQfpXRBumPbsz0P2CQLXI/254ZsJQqwiIMR3nqlHfBVWKlR0DFQt5d
qLCySICqyVW4eoWtDBCx24Pp4GfdjzOWTGsCQwIDAQABAoIBADafVuvDwwdxuxMA
WSrCnSPD4ymVLFvpNNjgPbKlGhMMRC9PCwL5iQw17hXfRcqCdBPPTJ1GD9PXfvnp
oTtzfnTFIDGReEOxGmZhx3QTMgB+veGWmo3+jG2pnNyArcRfgGmyfh1XmlnqAj9v
eP8hoG/qGzAcZB3M9RLVTXfV7lrHkA3pkApi5HnBVXnyKihpy1BUitlNDmI8UYc2
s9Sr66vqQ5FoWYPjFwrdqQmHk/yxiFfMnS7Xx24nMN7/bPZNV6+K4ufgwFJXflg8
6BJXx8Xqn6o2GvqJWOcnWcyKr06hnILvyMaW6acHtUuNwcmaPrQCtfinQqQOq2Oo
8wCGByECgYEA36o0KAulGb13z9lF62bXVmBnpPEcpZv0u2qJ1Gj6f+ozv1pAjtQe
P6pU6fRr2WzZZ+b8EdE4HMe2s2DeVTqBycANjrvc4WYQKuZCVr1hrNV+q5ZFxYoD
EyFZPYdSBPq9mo1coqvXFGXuu3cwVAczgTBdNTadExVpClPU6qj0SJUCgYEAwN6T
cdYy0yxdepNOsjqqHc+aAgoGLPjIrt2yZFg9XykYpxUWeqQjSBP083FWDxfpKU12
n2pbFkz0T3FRqYG/sw64sIGI96yJaP4rne6poAaU07UR3MjiVqX4FiWkUYVtfIA9
euYaQKOmdwSZyJ8i1Vte6r6sw6pAJTH3Y9kl8XcCgYEAoQ23Rsqz1OgYmQM0FMDV
+G2s1BmGbj3xqO6bVudM0cT8BCLh77cQHPny8RA+hK6bkfTCt7W2uQqaJWpwTmC1
ymfPm2LtNyS+KZXqWPk/lyuYbcfkb8zkT+cokmSZi9pdoyd9d+lTE24ezMCTfT4+
OR1xUHsF+hLlszkQTPTiCk0CgYAsDWqOEMexFiwPyD+sU9vxTS63EoUQlo536mlJ
pCH4b1GTMCzfPEhWuUA0rolijyqRZYEXrlo5wL/4uUBWwC0B//XNUvju4TjNg2iA
/Tc/NuGdbXkz/ao88lG09UoP2LMGQeBJBu+uHfLysllRyo9RPjpy0bRySJu4Iy6H
XtzcxwKBgEARjbUafrtixwflkquUDT4gjNTkLQ1NvNY6xS6eafuYgmhET0gyBlqq
8lDI+lmlQvzRwAek9BhSGWQXZSx0JCh9agIu0Dl2/UR92uoRTNPB5TrVLO3oVsAc
dwxsyAOgu8OWRHgQlRuw6UL+jj7CRawvK0Y4NqwBbE8jaPW+AeWT
-----END RSA PRIVATE KEY-----`

const cert = `-----BEGIN CERTIFICATE-----
MIIC2TCCAcGgAwIBAgIUOVhaB+dZ/JW4yei2Hg38JaXDvckwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTIyMDQyNzEzMzcyN1oYDzIxMDQw
NjE2MTMzNzI3WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCogh2JdK6gLxNKIKJ6SRKic91DoZiSaGoRtARGy0ae
FQG66t4KwW8sq7j/DWVj1Dc36BjUsuPr1+4V/MKal5HQUsYwtDNZVaG2Aye9nBpE
KpdC6PYT31ktC4z3ulPV72E80UpG7PTiNzFsnpba3jSO/1B5wLa2Hpg4CgeU1w4J
Cw+DQYbwMds7K+Zx4N9QF5lsyYkR4trc+pSZBjlfs/JzVv+Rd0VjMvXcIko6PRUP
dH4iC+O94E06uxlC4xB+ldEG6Y9uzPQ/YJAtcj/bnhmwlCrCIgxHeeqUd8FVYqVH
QMVC3l2osLJIgKrJVbh6ha0MELHbg+ngZ92PM5ZMawJDAgMBAAGjITAfMB0GA1Ud
EQQWMBSCBXRlc3Qyggt0ZXN0Mi5kYXBweTANBgkqhkiG9w0BAQsFAAOCAQEAJC8S
53t0un7d006TG3bQ6wBenLxlb3UzUBgmBi6gkEFYRP/R9bES1PGHTmU8Baaarf2u
nyWWt423/YMp7P8FWFLI71OSchGPavyEi919QAzLgYuo6UdEQYE4dCTETwqrecSF
x/VZCdCmEVRv7zehQuFVYKJms/ppSgAx24QLUlxlEOmeK3x7oKGBr9Qq8QfsO5vB
sMC1HrOvBD1MK3AWGjsD46OYJuPZV/BC0q0UfK0CFTdI8AZ2a72f2JxNhgFWdHLE
xi9pPdvlKDeCuUSW85bgMIlnj8JR0DiU0K4rjuYqJWWZzxnHlRM+9zTnUr/JP2Lw
9a0xl+t6l+OAfJ7hgA==
-----END CERTIFICATE-----`;

const app = express();

app.get('/test2script.js', (req, res) => {
  res.setHeader('Content-Type', "text/javascript");
  res.send(fs.readFileSync(__dirname + '/test2script.js', 'utf8'))
});
app.get('/test2img.jpg', (req, res) => {
  res.setHeader('Content-Type', "image/png");
  res.send(fs.readFileSync(__dirname + '/test2img.png'))
});
app.get('*', (req, res) => {
  res.send('<html>test2</html>')
});

const options = {
  key,
  cert,
  minVersion: 'TLSv1.3',
  cipher: 'TLS_AES_256_GCM_SHA384',
};
const serverHttps = https.createServer(options, app);

serverHttps.listen(3006)
console.log("(test2) listenning on 127.0.0.1:3006")