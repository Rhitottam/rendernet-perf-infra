const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { spawn } = require('child_process');
const basicAuth = require('express-basic-auth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();
const { getFileNames, readJsonFiles } = require("./utils/utils");
const ENV = process.env;
// Store running processes and their logs
const processes = new Map();
const ALLOWED_TEST_FILENAMES = new Set(getFileNames());
console.log('Allowed Tests:- \n' + [...ALLOWED_TEST_FILENAMES].join('\n'));
// Basic authentication middleware
const auth = basicAuth({
  users: { 'admin': 'password123' },
  challenge: true,
  realm: 'Command Execution Server'
});

const logsNamespace = io.of('/logs');

app.use(express.json());

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, '../performance-metrics-viewer/build')));

// API routes with /api prefix
app.use('/api', auth, async (req, res, next) => {
  // Add common API headers
  res.header('X-API-Version', '1.0.0');
  next();
});


// Get available tests
app.get('/api/tests', auth, async (req, res) => {
  try {
    const testFileNames = await getFileNames();
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.json(testFileNames);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read JSON files',
      details: error.message
    });
  }
});
/*
curl -X POST http://localhost:3000/run-performance-test \
     -u admin:password123 \
     -H "Content-Type: application/json" \
     -d '{"testName": "studio-feed-performance-tests.spec.js ", "baseUrl": "http://localhost:3000"}'
*/
// Run Performance Test
app.post('/api/run-performance-test', auth, (req, res) => {
  const { testName, baseUrl, browser='chromium', feedSize=500 } = req.body;

  // Validate command
  if (!testName || !ALLOWED_TEST_FILENAMES.has(testName)) {
    return res.status(400).json({
      error: 'Invalid test selected'
    });
  }

  const testPath = `tests/${testName}.spec.js`;

  // const commandPrefix = `${baseUrl?.length ? `BASE_URL=${baseUrl}` : ''}`
  // const testCommand = `npx playwright test ${testPath} --project=${browser}`;
  // const command = `cd.. && ${commandPrefix} ${testCommand}`;
  const commandData = {
    command: 'env',
    args: [
      ...(baseUrl ? [`BASE_URL=${baseUrl}`] : []),
      ...(feedSize ? [`FEED_SIZE=${feedSize}`] : []),
      ...['npx', 'playwright', 'test', testPath, `--project=${browser}`]
    ],
    options: {
      cwd: `${__dirname}/..`
    },
  };
  const processId = uuidv4();


  const processInfo = {
    startTime: new Date(),
    status: 'initializing',
    command: commandData,
    testUrl: baseUrl,
    feedSize,
    testPath,
    browser,
    logs: [],
    process: null,
    exitCode: null
  };

  processes.set(processId, processInfo);

  try {
    // Spawn the process
    const process = spawn(commandData.command, commandData.args, commandData.options);
    fetch(ENV.SLACK_WEBHOOK_URL,
      {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          text: [`Frontend Performance Test Started:-`,
            `Test name: ${processInfo.testPath}`,
            `Test URL: ${processInfo.testUrl}`,
            `Feed size: ${processInfo.feedSize}`,
            `Browser: ${processInfo.browser}`,
            `Status: ${processInfo.status}`,].join('\n'),
        })
      });
    processInfo.process = process;
    processInfo.status = 'running';

    process.stdout.on('data', (data) => {
      const log = data.toString().trim();
      processInfo.logs.push(log);
      logsNamespace.to(processId).emit('log', log);
    });

    process.stderr.on('data', (data) => {
      const log = data.toString().trim();
      processInfo.logs.push(log);
      logsNamespace.to(processId).emit('log', log);
    });

    process.on('close', (code) => {
      processInfo.status = 'completed';
      processInfo.exitCode = code;
      logsNamespace.to(processId).emit('completed', {
        exitCode: code,
        logs: processInfo.logs
      });
      // curl -X POST -H 'Content-type: application/json' --data '{"text":"Performance-Infra reports"}' https://hooks.slack.com/services/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
      const resultsLog = processInfo.logs.find(log => log.includes('initial'));
      let testStatus = 'failed';
      if(resultsLog && resultsLog?.includes('initial') && resultsLog?.includes('reload')) {
        testStatus = 'complete';
      }
      fetch(ENV.SLACK_WEBHOOK_URL,
        {
          method: 'POST',
          headers: {
            'Content-type': 'application/json'
          },
          body: JSON.stringify({
            text: [testStatus === 'complete' ? `Frontend Performance Tests Completed:-` : `Frontend Performance Tests Error:-`,
              `Test name: ${processInfo.testPath}`,
              `Test URL: ${processInfo.testUrl}`,
              `Feed size: ${processInfo.feedSize}`,
              `Browser: ${processInfo.browser}`,
              `Status: ${processInfo.status}`,
              `Test Results: ${processInfo.logs.find(log => log.includes('initial'))
                ?.replaceAll('[32m', '\'')
                ?.replaceAll('[33m', '\'')
                ?.replaceAll('[39m', '\'')}`,].join('\n')
          })
        });
    });

    process.on('error', (error) => {
      processInfo.status = 'error';
      processInfo.logs.push(`Error: ${error.message}`);
      logsNamespace.to(processId).emit('error', {
        error: error.message
      });
    });

    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    res.json({
      processId,
      status: 'started',
      command: commandData,
      test: testPath,
      browser,
      baseUrl,
    });

  } catch (error) {
    processes.delete(processId);
    res.status(500).json({
      error: 'Failed to execute command',
      details: error.message
    });
  }
});

app.get('/api/status', auth, (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.json({
    status: [...processes.keys()]
      .map(processKey => {
      const processInfo = processes.get(processKey);
      return {
        processId: processKey,
        command: processInfo.command,
        status: processInfo.status,
        logs: processInfo.logs,
        exitCode: processInfo.exitCode
      }
    })
  });
});

// Get command execution status
app.get('/api/status/:processId', auth, (req, res) => {
  const { processId } = req.params;
  if(!processId) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.json({
     data: [...processes.keys()].map(processKey => {
       const processInfo = processes.get(processKey);
       return {
         processId: processKey,
         command: processInfo.command,
         status: processInfo.status,
         logs: processInfo.logs,
         exitCode: processInfo.exitCode
       }
     })
    })
  }
  const processInfo = processes.get(processId);

  if (!processInfo) {
    return res.status(404).json({ error: 'Process not found' });
  }
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  res
    .json({
    command: processInfo.command,
    status: processInfo.status,
    logs: processInfo.logs,
    exitCode: processInfo.exitCode
  });
});

app.get('/api/test-readings', auth, async (req, res) => {
  try {
    const directory = path.join(__dirname, '../tests/utils/test-readings'); // Adjust path as needed
    const jsonData = await readJsonFiles(directory);
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.json(jsonData);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read JSON files',
      details: error.message
    });
  }
});


logsNamespace.on('connection', (socket) => {
  const processId = socket.handshake.query.processId;

  if (!processId || !processes.has(processId)) {
    socket.disconnect();
    return;
  }

  socket.join(processId);

  const processInfo = processes.get(processId);
  processInfo.logs.forEach(log => {
    socket.emit('log', log);
  });

  if (processInfo.status === 'completed') {
    socket.emit('completed', {
      exitCode: processInfo.exitCode,
      logs: processInfo.logs
    });
  }

  socket.on('disconnect', () => {
    socket.leave(processId);
  });
});

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../performance-metrics-viewer/build', 'index.html'));
});

// Cleanup old processes
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const [processId, processInfo] of processes.entries()) {
    if (processInfo.status === 'completed' && processInfo.startTime < oneHourAgo) {
      processes.delete(processId);
    }
  }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});