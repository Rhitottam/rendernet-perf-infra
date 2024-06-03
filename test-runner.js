
const {runTest: runTlDrawTest}= require("./test-tldraw");
const {runTest: runKovaTest}= require("./test-konva");
const {runTest: runLongTlDrawTest}= require("./long-test-tldraw");
const {runTest: runLongKovaTest}= require("./long-test-konva");
const fs = require('node:fs');
const devices = [
  {
    label: 'PC',
    cpuThrottling: 1,
  },
  {
    label: 'Tablet',
    device: 'iPad Pro landscape',
    cpuThrottling: 2,
  },
  {
    label: 'Slow Laptop',
    cpuThrottling: 4,
  },
  {
    label: 'Slow Tablet',
    device: 'Galaxy S5 landscape',
    cpuThrottling: 8
  },
]
const runTest = async () => {
  const commandArguments = process.argv.slice(2);
  const test = devices;
  const results = {};

  for (const dev of test) {
    try{
      if (commandArguments[0] === 'tldraw') {
        results[dev.label] = await runLongTlDrawTest(dev);
      } else if (commandArguments[0] === 'konva') {
        results[dev.label] = await runLongKovaTest(dev);
      }
    }
    catch (err) {
      console.error(err);
    }

  }
  console.log(results);
  try {
    fs.writeFileSync(commandArguments[0]+'.json', JSON.stringify(results), 'utf8');
  } catch (err) {
    console.error(err);
  }
}
runTest();