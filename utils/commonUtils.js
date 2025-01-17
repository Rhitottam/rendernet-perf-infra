const pt = require('puppeteer');
const tracealyzer = require('tracealyzer');
const dotenv = require('dotenv');
const {KnownDevices} = require("puppeteer");

const pidusage = require('pidusage');
const exec = require('child_process').exec;
dotenv.config();

const DB_NAME = 'ImageMetricsDB';
const STORE_NAME = 'imageLoadTimes';
const DB_VERSION = 1;




const getAllImageLoadTimes = async (p) => {
  return await p.evaluate(async () => {
    const DB_NAME = 'ImageMetricsDB';
    const STORE_NAME = 'imageLoadTimes';
    const DB_VERSION = 1;
    const initDB = () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, {
              keyPath: 'imageUrl',
              autoIncrement: true,
            });
          }
        };
      });
    };
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
};


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
  await addTimeout(1000);
  await performPan(p, start, [-500, 0]);
  // await addTimeout(2000);
  await performPan(p, start, [500, 0]);
  // await addTimeout(2000);
  await performPan(p, start, [500, 0]);
  // await addTimeout(2000);
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
  await p.tracing.start({path: 'traces/'+traceFileName});
  await p.waitForSelector('#email');
  await p.type('#email', process.env.EMAIL);
  await p.waitForSelector('#password');
  await p.type('#password', process.env.PASSWORD);
  await p.click('#login-button');
  await p.waitForNavigation();
  return {p, traceFileName, recordingFileName};
}

const  autoScroll = async (page, maxScrolls = 50) => {
  await page.evaluate(async (maxScrolls) => {
    await new Promise(async (resolve) => {
      let totalHeight = 0;
      let scrolls = 0;  // scrolls counter
      let timer = setInterval(() => {
        const studioFeed = document.getElementById('studio_feed_wrapper');
        if(studioFeed == null) {
          console.log('feed not found>>>>>>>>>>>>>>');
        }
        else {
          let scrollHeight = studioFeed.scrollHeight;
          let scrollTop= studioFeed.scrollTop;
          studioFeed.scrollTop += studioFeed.clientHeight;
          totalHeight += studioFeed.clientHeight;
          scrolls++;  // increment counter

          // stop scrolling if reached the end or the maximum number of scrolls
          if (scrolls >= maxScrolls || scrollTop === studioFeed.scrollTop ) {
            clearInterval(timer);
            resolve();
          }
        }
      }, 2000);
    });
  }, maxScrolls);  // pass maxScrolls to the function
}
const calculateLoadTimeStats = (loadTimes) => {
  if (!loadTimes || loadTimes.length === 0) {
    return {
      average: 0,
      median: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0,
      count: 0
    };
  }

  // Extract load times array
  const times = loadTimes.map(item => item.loadTimeMs);

  // Sort times for percentile calculations
  const sortedTimes = [...times].sort((a, b) => a - b);

  // Calculate average
  const average = times.reduce((sum, time) => sum + time, 0) / times.length;

  // Calculate median (p50)
  const medianIndex = Math.floor(sortedTimes.length / 2);
  const median = sortedTimes.length % 2 === 0
    ? (sortedTimes[medianIndex - 1] + sortedTimes[medianIndex]) / 2
    : sortedTimes[medianIndex];

  // Calculate percentiles
  const getPercentile = (arr, p) => {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[index];
  };

  const p95 = getPercentile(sortedTimes, 95);
  const p99 = getPercentile(sortedTimes, 99);

  return {
    average: Math.round(average),
    median: Math.round(median),
    p95: Math.round(p95),
    p99: Math.round(p99),
    min: sortedTimes[0],
    max: sortedTimes[sortedTimes.length - 1],
    count: times.length
  };
};

const loadAppWebsite = async (p, browser) => {
  let start = performance.now();
  await p.goto(process.env.BASE_URL);
  await p.waitForSelector('#home-page-header');
  let end = performance.now();
  const initialLoadTime = end - start;
  const preReloadUsageData = await getUsageDetails(browser);
  start = performance.now();
  await p.reload();
  await p.waitForSelector('#home-page-header');
  end = performance.now();
  const postReloadUsageData = await getUsageDetails(browser);
  const nextLoadTime = end-start;
  return {
    initialLoadTime,
    preReloadUsageData,
    nextLoadTime,
    postReloadUsageData,
  }
}

const loadStudioFeedPage = async (p, browser) => {
  const start = performance.now();
  await p.goto(process.env.BASE_URL + '/app/text-to-image');
  await addTimeout(1000);
  await autoScroll(p);
  await addTimeout(10000);
  await p.waitForNetworkIdle({
    concurrency: 10,
    idleTime: 500,
    timeout: 3600000,
  });
  const uncachedUsageData = await getUsageDetails(browser);
  const uncachedLoadTimes = await getAllImageLoadTimes(p);
  const uncachedLoadTimeStats = calculateLoadTimeStats(uncachedLoadTimes);
  await p.evaluate(() => {
    const DB_NAME = 'ImageMetricsDB';
    indexedDB.deleteDatabase(DB_NAME);
  })
  await p.reload();
  await autoScroll(p);
  await addTimeout(10000);
  await p.waitForNetworkIdle({
    concurrency: 10,
    idleTime: 500,
    timeout: 3600000,
  });
  const cacheUsageData = await getUsageDetails(browser);
  const cachedLoadTimes = await getAllImageLoadTimes(p);
  const cachedLoadTimeStats = calculateLoadTimeStats(cachedLoadTimes);
  await p.evaluate(() => {
    const DB_NAME = 'ImageMetricsDB';
    indexedDB.deleteDatabase(DB_NAME);
  })
  await p.waitForNetworkIdle({
    concurrency: 200,
    idleTime: 500,
    timeout: 3600000,
  });

  const end = performance.now();
  // await p.click('#canvas-fit-to-screen-tool');
  return {
    timeToLoad: (end-start)/1000,
    uncachedUsageData,
    cacheUsageData,
    uncachedLoadTimeStats,
    cachedLoadTimeStats
  }
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

const runLongCanvasTest = async (browser, p, canvasSelector, timeout) => {
  const e = await p.$(canvasSelector);
  const box = await e.boundingBox();
  const point = [box.x + box.width / 2, box.y + box.height / 2];
  let start = performance.now();
  let interval = start;
  const usageDetailsArray = [];
  while(true) {
    await performBasicOperations(p, point);
    const end = performance.now();
    if((end-interval)/1000 > 10) {
      const usageData = await getUsageDetails(browser);
      usageDetailsArray.push(usageData);
      interval = end;
    }
    if((end-start)/1000 > timeout) {
      break;
    }
  }
  console.log('long tests stopped');
 //  await performBasicOperations(p, point);
  return usageDetailsArray;
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
  let metrics = null;
  if(traceFileName)  metrics = tracealyzer('traces/'+ traceFileName);
  if(recorder) {
    await recorder.stop();
  }
  await p.browser().close();
  return requiredMetrics(metrics, pageMetrics);
}

const requiredMetrics = (metrics, pageMetrics) => {
  if (!metrics) {
    return {
      'heapTotalSize': pageMetrics['JSHeapTotalSize'],
      'heapUsedSize': pageMetrics['JSHeapUsedSize'],
    }
  }
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
  loadStudioFeedPage,
  runCanvasTest,
  runLongCanvasTest,
  endTest,
  getUsageDetails,
  loadAppWebsite
};