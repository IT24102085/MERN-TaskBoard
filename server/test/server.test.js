const assert = require('node:assert/strict');
const { once } = require('node:events');
const { request } = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const serverDirectory = path.resolve(__dirname, '..');

function getHealth(port) {
  return new Promise((resolve, reject) => {
    const healthRequest = request({
      hostname: '127.0.0.1',
      port,
      path: '/health',
      method: 'GET'
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });

    healthRequest.on('error', reject);
    healthRequest.end();
  });
}

async function waitForHealth(port, child) {
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error('Server exited before the health endpoint became available');
    }

    try {
      const response = await getHealth(port);
      if (response.status === 200) {
        return response;
      }
    } catch {
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for the health endpoint');
}

test('health endpoint reports readiness after MongoDB connects', async t => {
  const port = 5055;
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      MONGODB_URI: 'mongodb://127.0.0.1:27017/taskboard',
      JWT_SECRET: 'test-only-secret',
      FRONTEND_ORIGIN: 'http://localhost:5173'
    },
    stdio: 'ignore'
  });

  t.after(() => child.kill());

  const response = await waitForHealth(port, child);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), {
    status: 'ok',
    database: 'connected'
  });
});

test('rejects unsupported MongoDB URI schemes before listening', async () => {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      PORT: '5056',
      MONGODB_URI: 'postgres://127.0.0.1:5432/taskboard',
      JWT_SECRET: 'test-only-secret',
      FRONTEND_ORIGIN: 'http://localhost:5173'
    },
    stdio: 'ignore'
  });

  const [exitCode] = await once(child, 'exit');
  assert.equal(exitCode, 1);
});
