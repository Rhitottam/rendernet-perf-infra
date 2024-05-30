
const {runTest: runTlDrawTest}= require("./test-tldraw");
const {runTest: runKovaTest}= require("./test-konva");
const fs = require('node:fs');
const devices = [
  {
    label: 'PC',
    cpuThrottling: 1,
  },
  {
    label: 'Tablet',
    // device: 'iPad landscape',
    cpuThrottling: 2,
  },
  {
    label: 'Slow Laptop',
    // device: 'Galaxy S8 landscape',
    cpuThrottling: 4,
  },
  {
    label: 'Slow Tablet',
    cpuThrottling: 8
  },
]
const runTest = async () => {
  const commandArguments = process.argv.slice(2);
  const test = devices;
  const results = {};

  for (const dev of test) {
    if (commandArguments[0] === 'tldraw') {
      results[dev.label] = await runTlDrawTest(dev);
    } else if (commandArguments[0] === 'konva') {
      results[dev.label] = await runKovaTest(dev);
    }
  }
  try {
    fs.writeFileSync(commandArguments[0]+'.json', JSON.stringify(results), 'utf8');
  } catch (err) {
    console.error(err);
  }
}
runTest();