const pt = require('puppeteer');
const {
  options,
  startTest,
  loadStudioFeedPage,
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
    const {timeToLoad, cacheUsageData, uncachedUsageData, cachedLoadTimeStats, uncachedLoadTimeStats} = await loadStudioFeedPage(p, browser);
    console.log('Time taken to load studio feed: ', timeToLoad, 'seconds');
    // const usageResults  = await runLongCanvasTest(browser, p, '.tl-canvas', 1800);
    const perfData = await endTest(p);
    return {
      ...perfData,
      uncachedUsageData,
      cacheUsageData,
      cachedLoadTimeStats,
      uncachedLoadTimeStats,
      // 'usageDetails': usageResults,
    };
  });
}

module.exports = {runTest}