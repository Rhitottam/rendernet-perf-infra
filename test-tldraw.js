const pt = require('puppeteer');
const {
 options,
 startTest,
 loadCanvasPage,
 endTest,
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
    const recorder = await p.screencast({path: 'recordings/'+recordingFileName, speed: '0.5'});
    await p.tracing.start({path: 'traces/'+traceFileName});
    await runCanvasTest(p, '.tl-canvas');
    const usageDetails = await getUsageDetails(browser);
    const perfData = await endTest(p, traceFileName, recorder);
    return {
     ...perfData,
     'loadCanvasTime': timeToLoad + 's',
     'memory': usageDetails.memory,
     'cpu': usageDetails.cpu,
     'recording': recordingFileName,
     'trace': traceFileName,
    };
 });
}
module.exports = {runTest}