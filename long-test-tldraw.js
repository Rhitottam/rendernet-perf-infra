const pt = require('puppeteer');
const {
  options,
  startTest,
  loadCanvasPage,
  endTest,
  runLongCanvasTest,
  runCanvasTest,
  getUsageDetails
} = require("./utils/commonUtils");
const pidusage = require('pidusage');
const exec = require('child_process').exec;

const runTest = async (runConfig = {}) => {
  return await pt.launch(options).then(async browser => {
    const {p, traceFileName, recordingFileName} = await startTest(browser, runConfig);
    const {timeToLoad} = await loadCanvasPage(p, '.tl-image');
    console.log('Time taken to load canvas: ', timeToLoad, 'seconds');
    const usageResults  = await runLongCanvasTest(browser, p, '.tl-canvas', 1800);
    const perfData = await endTest(p);
    return {
      ...perfData,
      'loadCanvasTime': timeToLoad + 's',
      'usageDetails': usageResults,
    };
  });
}
module.exports = {runTest}