const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { spawn } = require('child_process');
const basicAuth = require('express-basic-auth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { getFileNames, readJsonFiles, readJsonFileSync } = require("./utils/utils");
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
app.post('/api/run-performance-test', auth, async (req, res) => {
  const { testName, baseUrl, browser = 'chromium', feedSize = 500, compareWith = [], sendSlackNotification = true } = req.body;

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
    exitCode: null,
    compareWith,
    sendSlackNotification
  };

  processes.set(processId, processInfo);

  try {
    // Spawn the process
    const process = spawn(commandData.command, commandData.args, commandData.options);
    
    if (sendSlackNotification) {
      fetch(ENV.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({
          text: formatSlackMessage(processInfo)
        })
      });
    }

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

    process.on('close', async (code) => {
      processInfo.status = 'completed';
      processInfo.exitCode = code;
      logsNamespace.to(processId).emit('completed', {
        exitCode: code,
        logs: processInfo.logs
      });

      if (sendSlackNotification) {
        try {
          // Fetch test readings for comparisons
          const testReadings = await readJsonFiles(path.join(__dirname, '../tests/utils/test-readings'));
          const messages = formatSlackMessage(processInfo, compareWith, testReadings);
          fetch(ENV.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify({
              text: messages
            })
          });
        } catch (error) {
          console.error('Error sending Slack notification:', error);
        }
      }
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
    const { testName } = req.query;
    const directory = path.join(__dirname, '../tests/utils/test-readings');
    const jsonData = await readJsonFiles(directory);
    // If testName is provided, filter the results
    if (testName) {
      const filteredData = Object.entries(jsonData)
        .filter(([key]) => {
          const [prefix, currentTestName] = key.split('|');
          return prefix === 'test-data' && currentTestName === testName;
        })
        .reduce((acc, [key, value]) => ({
          ...acc,
          [key]: value
        }), {});

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.json(filteredData);
    }

    // If no testName provided, return all data
    res.header('Access-Control-Allow-Origin', '*');
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

const calculatePercentageChange = (current, previous) => {
  const change = ((current - previous) / previous) * 100;
  return change.toFixed(2);
};

const formatMetricComparison = (metricName, currentValue, previousValue) => {
  const isTimingMetric = metricName.toLowerCase().includes('time') ||
                        metricName.toLowerCase().includes('duration') ||
                        metricName.toLowerCase().includes('delay') ||
                        metricName.toLowerCase().includes('paint') ||
                        metricName.toLowerCase().includes('interactive');
  
  if (!isTimingMetric) return null; // Only compare timing metrics

  const percentageChange = calculatePercentageChange(currentValue, previousValue);
  const isImprovement = currentValue <= previousValue;

  return {
    metric: metricName,
    current: currentValue,
    previous: previousValue,
    percentageChange,
    isImprovement
  };
};

const formatSlackMessage = (processInfo, comparisons = [], testReadings = {}) => {
  let message = [
    `Frontend Performance Test ${processInfo.status === 'completed' ? 'Completed' : 'Started'}:-`,
    `Test name: ${processInfo.testPath}`,
    `Test URL: ${processInfo.testUrl}`,
    `Feed size: ${processInfo.feedSize}`,
    `Browser: ${processInfo.browser}`,
    `Status: ${processInfo.status}`
  ];

  // Add comparison results if test is completed and has comparisons
  if (processInfo.status === 'completed' && comparisons.length > 0) {
    const resultsLog = processInfo.logs.find(log => log.includes('initial'));
    const testFileName =  processInfo.logs.find(log => log.includes('test-data|'));
    if (resultsLog && testFileName) {

      try {
        // // Sanitize ANSI color codes from the log
        // const sanitizedLog = resultsLog
        //   .replaceAll('[32m', '\'')
        //   .replaceAll('[33m', '\'')
        //   .replaceAll('[39m', '\'')
        //   .replaceAll('\'', '')
        //   .replaceAll(/([a-z][a-zA-Z0-9]+)/g, "\"$1\"")
        //   .replaceAll('\n', '')
        //   .replaceAll(/\s+/g, '');
        //   // .replaceAll(/([0-9]+\.[0-9]+)/g, "\"$1\"");
        // // Extract the JSON string from the sanitized log
        // fs.writeFileSync('sanitized-log.json', sanitizedLog);
        // const jsonStr = readJsonFile(testFileName);
        // // Parse the sanitized JSON string
        // const currentResults = JSON.parse(jsonStr);
        const currentResults = readJsonFileSync(testFileName);
        message.push('\nComparisons:');
      
        comparisons.forEach(comparisonKey => {
          const comparisonData = testReadings[comparisonKey];
          if (!comparisonData) return;

          const [, , comparisonUrl, comparisonDate, comparisonTime] = comparisonKey.split('|');
          message.push(`\nComparing with: ${comparisonUrl} (${comparisonDate} ${comparisonTime.replace(/-/g, ':')}):`);

          // Compare metrics
          Object.keys(currentResults.initial).forEach(metric => {
            if (typeof currentResults.initial[metric] === 'number' && 
                typeof comparisonData.initial[metric] === 'number') {
              const comparison = formatMetricComparison(
                metric,
                currentResults.initial[metric],
                comparisonData.initial[metric]
              );

              if (comparison) {
                const { isImprovement, percentageChange } = comparison;
                const icon = isImprovement ? '✅' : '❌';
                const changeText = isImprovement ? 'improvement' : 'regression';
                
                message.push(`${icon} ${metric}: ${(currentResults.initial[metric] / 1000).toFixed(3)}s vs ${(comparisonData.initial[metric] / 1000).toFixed(3)}s (${Math.abs(percentageChange)}% ${changeText})`);
              }
            }
          });
        });
      } catch (error) {
        console.error('Error parsing test results:', error);
        message.push('\nError: Failed to parse test results for comparison');
      }
    }
  }
  return message.join('\n');
};