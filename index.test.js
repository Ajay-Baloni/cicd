const http = require('http');
const assert = require('assert');
const server = require('./index.js');

server.listen(0, () => {
  const { port } = server.address();

  http.get(`http://localhost:${port}`, (res) => {
    assert.strictEqual(res.statusCode, 200);
    console.log('Test passed: server responds with 200');
    server.close();
    process.exit(0);
  }).on('error', (err) => {
    console.error('Test failed:', err);
    server.close();
    process.exit(1);
  });
});
