## Examples of web applications

#### Hello world

Hello world is both a test page for CSP, and a Hello world web app. You need to also run test2 to properly test CSP.

It runs at `https://127.0.0.1:3005`, `https://helloworld.dappy:3005` in dappy name system. Zone is `examples/helloworld.zone.json`.

```
# run https server
node examples/helloworld.js
```

#### test2

test2 is complementary to helloworld.

It runs at `https://127.0.0.1:3006`, `https://test2.dappy:3006` in dappy name system. Zone is `examples/test2.zone.json`.

```
# run https server
node examples/test2.js
```