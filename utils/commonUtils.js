const pt = require('puppeteer');
const tracealyzer = require('tracealyzer');
const dotenv = require('dotenv');
const {KnownDevices} = require("puppeteer");

const pidusage = require('pidusage');
const exec = require('child_process').exec;
dotenv.config();

const addTimeout = async (timeout) => {
  await new Promise(resolve => setTimeout(resolve, timeout));
}

const performZoomIn = async (p, count= 1) => {
  for (let i=0;i<count;i++) {
    await p.waitForSelector('#canvas-zoom-in-tool');
    await p.click('#canvas-zoom-in-tool');
    await addTimeout(1000);
  }
}

const performZoomOut = async (p, count = 1) => {
  for (let i=0;i<count;i++) {
    await p.waitForSelector('#canvas-zoom-out-tool');
    await p.click('#canvas-zoom-out-tool');
    await addTimeout(1000);
  }
}


const performPan = async (p, move, diff, count = 1) => {
  for (let i=0;i<count;i++) {
    await p.keyboard.down('Space');
    await p.mouse.down({
      button: 'left',
    });
    await p.mouse.move(move[0] + diff[0], move[1] + diff[1], {steps: 1});
    await p.mouse.up({
      button: 'left',
    });
    await p.mouse.move(move[0], move[1], {steps: 1});
    await p.keyboard.up('Space');
    await addTimeout(1000);
  }
}

const performBasicOperations = async (p, start) => {
  await performZoomIn(p, 2);
  await p.mouse.move(start[0], start[1], {steps: 1});
  await addTimeout(5000);
  await performPan(p, start, [-500, 0]);
  await addTimeout(2000);
  await performPan(p, start, [500, 0]);
  await addTimeout(2000);
  await performPan(p, start, [500, 0]);
  await addTimeout(2000);
  await performPan(p, start, [-500, 0]);
  await performZoomOut(p, 2);
}


//launch browser
const args = [
  "--start-maximized", // Launch browser in maximum window
  "--no-default-browser-check", // Disable the default browser check, do not prompt to set it as such
  "--disable-popup-blocking",
  "--disable-web-security",
  "--no-first-run", // Skip first run wizards
  "--test-type" // Removes "Chrome is being controlled by automated test software", needs to be combined with ignoreDefaultArgs: ["--enable-automation"]
];
const igrDefaultArgs = [
  //"--enable-automation" // Will remove --enable-automation from default launched args for puppeteer
];
const options = {
  args,
  headless: false, // default is true
  // slowMo: 50,
  ignoreDefaultArgs: igrDefaultArgs,
  defaultViewport: null, // Launch page in max resolution and disables defaults to an 800x600 viewport
  devtools: false,
  ignoreHTTPSErrors: true,
};


const CPUThrottling = 1;
const startTest = async (browser, {cpuThrottling, device, networkConditions}={}) => {
  const p = await browser.newPage();
  const cpuThrottlingValue = (cpuThrottling ?? CPUThrottling);
  console.log('CPU Throttling: ', cpuThrottlingValue + 'x slower');
  await p.emulateCPUThrottling(cpuThrottlingValue);
  if(device && KnownDevices[device] != null) {
    console.log('Emulating Device: ', device);
    await p.emulate(KnownDevices[device]);
  }
  if(networkConditions) {
    console.log('Emulating Network Conditions: ', networkConditions);
    await p.emulateNetworkConditions(networkConditions);
  }
  await p.goto(process.env.BASE_URL + process.env.LOGIN_PATH);
  const time = new Date().toLocaleString().replace(/\/|:|\s/g, '_').replace(',', '-')
  console.log(time);
  const traceFileName = `trace-${time}.json`;
  const recordingFileName = `recording-${time}.webm`;
  console.log('Recording file name: ', recordingFileName);
  console.log('Trace file name: ', traceFileName);
  // await p.tracing.start({path: 'traces/'+traceFileName});
  await p.waitForSelector('#email');
  await p.type('#email', process.env.EMAIL);
  await p.waitForSelector('#password');
  await p.type('#password', process.env.PASSWORD);
  await p.click('#login-button');
  await p.waitForNavigation();
  return {p, traceFileName, recordingFileName};
}

const loadCanvasPage = async (p, requiredSelector) => {
  const start = performance.now();
  await p.goto(process.env.BASE_URL + process.env.CANVAS_PATH + '/' + process.env.CANVAS_ID);
  await p.waitForSelector('#cross-button');
  await p.click('#cross-button');
  await p.waitForSelector('#canvas-fit-to-screen-tool');
  await p.click('#canvas-fit-to-screen-tool');
  await p.waitForSelector(requiredSelector);
  await p.click('#canvas-fit-to-screen-tool');
  await p.click('#canvas-fit-to-screen-tool');
  await p.waitForNetworkIdle({
    concurrency: 200,
    idleTime: 500,
    timeout: 3600000,
  });
  const end = performance.now();
  await p.click('#canvas-fit-to-screen-tool');
  return {
    timeToLoad: (end-start)/1000,
  }
}

const runCanvasTest = async (p, canvasSelector) => {
  const e = await p.$(canvasSelector);
  const box = await e.boundingBox();
  const point = [box.x + box.width / 2, box.y + box.height / 2];
  await performBasicOperations(p, point);
}
const getUsageDetails =  async (browser) => {
  const browserProcess = await browser.process();
  const tabs = await new Promise((resolve) => {
    exec(`pgrep -P ${browserProcess.pid}`,
      function(error, stdout, stderr){
        resolve(stdout.split('\n'));
      });
  });
  const usageDetails =  await Promise.all(
    tabs.map(processId => pidusage(browserProcess.pid))
  ).then((results) => {
    return results.reduce((ret, result) => {
      for(const key in result) {
        ret[key] = (ret[key] ?? 0) + result[key];
      }
      return ret;
    }, {});
  });
  return {...usageDetails};
}
const endTest = async (p, traceFileName, recorder) => {
  await p.tracing.stop();
  const pageMetrics = await p.metrics();
  const metrics = tracealyzer('traces/'+ traceFileName);
  await recorder.stop();
  await p.browser().close();
  return requiredMetrics(metrics, pageMetrics);
}

const requiredMetrics = (metrics, pageMetrics) => {
   return {
     ...metrics.profiling.categories,
     'majorGC': metrics.profiling.events['Major GC'],
     fps: {
       mean: metrics.rendering.fps.mean,
       variance: metrics.rendering.fps.variance,
       max: metrics.rendering.fps.hi,
       min: metrics.rendering.fps.lo,
     },
     'heapTotalSize': pageMetrics['JSHeapTotalSize'],
     'heapUsedSize': pageMetrics['JSHeapUsedSize'],
   }
}


module.exports = {
  performBasicOperations,
  performPan,
  performZoomIn,
  performZoomOut,
  addTimeout,
  options,
  startTest,
  loadCanvasPage,
  runCanvasTest,
  endTest,
  getUsageDetails,
};