// @ts-check
const { test, beforeEach, expect } = require('@playwright/test');
const dotenv = require('dotenv');
const feedData = require('../test-data/canvasData.json');


const autoScroll =  async (p, maxScrolls) => {
  await p.evaluate(async (maxScrolls) => {
    await new Promise(async (resolve) => {
      let totalHeight = 0;
      let scrolls = 0;  // scrolls counter
      let timer = setInterval(() => {
        const studioFeed = document.getElementById('studio_feed_wrapper');

        if(studioFeed != null) {
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
  }, maxScrolls);
}

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

const clearLoadTimes = async (p) => {
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
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
};


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

const getNavigationTimingData  = async (p) => {
  const navigationTimingJson = await p.evaluate(() =>
    JSON.stringify(performance.getEntriesByType('navigation'))
  );
  // Data expected:
  //   [{
  //   name: 'https://danube-web.shop/',
  //   entryType: 'navigation',
  //   startTime: 0,
  //   duration: 1243.7999999998137,
  //   initiatorType: 'navigation',
  //   nextHopProtocol: 'http/1.1',
  //   workerStart: 0,
  //   redirectStart: 0,
  //   redirectEnd: 0,
  //   fetchStart: 0.10000000009313226,
  //   domainLookupStart: 1.2000000001862645,
  //   domainLookupEnd: 11.100000000093132,
  //   connectStart: 11.100000000093132,
  //   connectEnd: 336.8000000002794,
  //   secureConnectionStart: 102.89999999990687,
  //   requestStart: 336.89999999990687,
  //   responseStart: 432.39999999990687,
  //   responseEnd: 433.70000000018626,
  //   transferSize: 971,
  //   encodedBodySize: 671,
  //   decodedBodySize: 671,
  //   serverTiming: [],
  //   workerTiming: [],
  //   unloadEventStart: 0,
  //   unloadEventEnd: 0,
  //   domInteractive: 1128.8999999999069,
  //   domContentLoadedEventStart: 1128.8999999999069,
  //   domContentLoadedEventEnd: 1130.8999999999069,
  //   domComplete: 1235.3999999999069,
  //   loadEventStart: 1235.3999999999069,
  //   loadEventEnd: 1235.3999999999069,
  //   type: 'navigate',
  //   redirectCount: 0
  // }]
  return JSON.parse(navigationTimingJson);
}

const increaseResourceTimingBufferSize = async (p) => {
  await p.evaluate(() => {
    performance.setResourceTimingBufferSize(2000);
  });
}

const getResourceObservedData = async (p) => {
  const resourceObservedJson = await p.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
          // const data = {};
          let count = 0;
          let average = 0;
          let max = 0;
          list.getEntries()
            .filter(entry => entry.name.includes('.webp') || entry.name.includes('.svg'))
            .forEach((entry, index) => {
            const request = entry.responseEnd - entry.requestStart;
            if (request > 0) {
              average = (average * count + request)/(count+1)
              // data[entry.name] = request;
              count+=1
              max = Math.max(max, request);
            }
          });
          resolve({average, count, max});
        }
      ).observe({type: 'resource', buffered: true});
    });
  });

  return resourceObservedJson
}

const getImageResourceTimingData = async (p) => {
  const resourceTimingJson = await p.evaluate(() =>
    JSON.stringify(window.performance.getEntriesByType('resource'))
  )

  const resourceTiming = JSON.parse(resourceTimingJson);
  // Data expected:
  // [{
  //   name: 'https://danube-web.shop/static/logo-horizontal.svg',
  //     entryType: 'resource',
  //   startTime: 1149.1000000000931,
  //   duration: 96.89999999990687,
  //   initiatorType: 'img',
  //   nextHopProtocol: 'http/1.1',
  //   workerStart: 0,
  //   redirectStart: 0,
  //   redirectEnd: 0,
  //   fetchStart: 1149.1000000000931,
  //   domainLookupStart: 1149.1000000000931,
  //   domainLookupEnd: 1149.1000000000931,
  //   connectStart: 1149.1000000000931,
  //   connectEnd: 1149.1000000000931,
  //   secureConnectionStart: 1149.1000000000931,
  //   requestStart: 1149.6000000000931,
  //   responseStart: 1244.3000000002794,
  //   responseEnd: 1246,
  //   transferSize: 21049,
  //   encodedBodySize: 20749,
  //   decodedBodySize: 20749,
  //   serverTiming: [],
  //   workerTiming: []
  // }]
  return resourceTiming.find((element) =>
    element.name.includes('.webp')
    || element.name.includes('.svg')
  );
}

const getPaintTimingData = async (p) => {
  const paintTimingJson = await p.evaluate(() =>
    JSON.stringify(window.performance.getEntriesByType('paint'))
  )
  // Data expected:
  //   [
  //   { name: 'first-paint', entryType: 'paint', startTime: 1149.5, duration: 0 },
  //     { name: 'first-contentful-paint', entryType: 'paint', startTime: 1149.5, duration: 0 }
  //   ]
  return JSON.parse(paintTimingJson);
}

const getLargestContentfulPaintData = async (p) => {
  const largestContentfulPaint = await p.evaluate(() => {
    return new Promise((resolve) => {
      let largestPaintTime = 0
      new PerformanceObserver((l) => {
        const entries = l.getEntries()
        // the last entry is the largest contentful paint
        const largestPaintEntry = entries.at(-1);
        largestPaintTime = largestPaintEntry.startTime
        resolve(largestPaintTime)
      }).observe({
        type: 'largest-contentful-paint',
        buffered: true
      });
      setTimeout(() => resolve(largestPaintTime), 5000)
    })
  })

  return largestContentfulPaint;
};


const getBlockingTimeData = async (p) => {
  const totalBlockingTime = await p.evaluate(() => {
    return new Promise((resolve) => {
      let totalBlockingTime = 0
      new PerformanceObserver(function (list) {
        const perfEntries = list.getEntries();
        for (const perfEntry of perfEntries) {
          totalBlockingTime += perfEntry.duration - 50
        }
        resolve(totalBlockingTime)
      }).observe({ type: 'longtask', buffered: true })

      // Resolve promise if there haven't been long tasks
      setTimeout(() => resolve(totalBlockingTime), 5000)
    })
  }, 0);

  return totalBlockingTime;
}


const mockAPisWithContext = async (browser) => {
  const context = await browser.newContext();
  await context.route(/.*\.(png|webp)/, async route => {
    await route.abort();
  });
  await context.route(/.*\/app\/v1\/media\/studio\/feed\?page=1&page_size=20\.*/,  async route => {
    const json = feedData;
    console.log('normal');
    await route.abort();
  });
  await context.route('*/**/app/v1/media/studio/feed?page=2&page_size=20',  async route => {
    const json = { data: [], err: {}};
    await route.fulfill({ json });
  });
  await context.route(/.*\/app\/v1\/media\/studio\/feed\.*/, async route => {
    const json = feedData;
    console.log('absolute');
    await route.fulfill({ json });
  });
  return context;
}

const mockAPis = async (page) => {
  // const context = await browser.newContext();
  await page.route(/.*\.(png|webp)/, async route => {
    console.log('image')
    await route.abort();
  });
  await page.route(/.*\/studio\/feed\?page=1&page_size=20\.*/,  async route => {
    const json = feedData;
    console.log('normal');
    await route.abort();
  });
  // await page.route('*/**/app/v1/media/studio/feed?page=2&page_size=20',  async route => {
  //   const json = { data: [], err: {}};
  //   await route.fulfill({ json });
  // });
  // await page.route(/.*\/app\/v1\/media\/studio\/feed\.*/, async route => {
  //   const json = feedData;
  //   console.log('absolute');
  //   await route.fulfill({ json });
  // });
}

const addFPSCounter = async (page) => {
  await page.evaluate(() => {
    const fpsCounter = () => {
      const decimalPlaces = 2;
      const updateEachSecond = 5;

// Cache values
      const decimalPlacesRatio = 10 ** decimalPlaces;
      let timeMeasurements = [];
      let fps = 0;
      let averageFps = 0;
      let minFps = 1000;
      let maxFps = 0;
      let fpsCount = 0;
      const tick = function () {
        timeMeasurements.push(performance.now());

        const msPassed = timeMeasurements[timeMeasurements.length - 1] - timeMeasurements[0];

        if (msPassed >= updateEachSecond * 1000) {
          fps =
            Math.round((timeMeasurements.length / msPassed) * 1000 * decimalPlacesRatio) /
            decimalPlacesRatio;
          timeMeasurements = [];
          if (fps > 0) {
            const fpsMeasurements = JSON.parse(localStorage.getItem('fps-measurements') ?? '{"averageFps": 0, "minFps": 1000, "maxFps": 0, "count": 0}');
            averageFps = (fpsMeasurements.averageFps * fpsMeasurements.count + fps) / (fpsMeasurements.count + 1);
            fpsCount = fpsMeasurements.count + 1;
            minFps = Math.min(fpsMeasurements.minFps, fps);
            maxFps = Math.max(fpsMeasurements.maxFps, fps);
            localStorage.setItem('fps-measurements', JSON.stringify({ averageFps, minFps, maxFps, count: fpsCount }));
          }
        }

        requestAnimationFrame(() => {
          tick();
        });
      };

      tick();
    };
    window.fpsCounter = fpsCounter;
  });
}

const runFPSCounter = async (page) => {
  await page.evaluate(() => {
    window.fpsCounter();
  });
}

const clearFPSCounter = async (page) => {
  await page.evaluate(() => {
    localStorage.removeItem('fps-measurements');
  });
}

const getFPSCounterData = async (page) => {
  return await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('fps-measurements') ?? '{}');
  });
}

// beforeEach(async ({ page: p, browser }) => {
//   await mockAPis(browser);
// });

const NavigationTypes = {
  INITIAL: 'initial',
  RELOAD: 'reload',
}

const navigateToStudioFeed = async (p) => {
  try {
    await p.waitForSelector('a[href="/app/text-to-image"]', {
      timeout: 1000,
    });
  }
  catch (e) {
    await p.click('#mobile-menu-button');
    await p.waitForSelector('a[href="/app/text-to-image"]', {
      timeout: 1000,
    });
  }
  await p.click('a[href="/app/text-to-image"]');
}

const getStudioFeedLoadAndScrollReadings = async (p, navigationType, maxScrolls = 200) => {
  const readings = {};

  if(navigationType === NavigationTypes.INITIAL) {
    await p.waitForURL(process.env.BASE_URL);
  }
  else if(navigationType === NavigationTypes.RELOAD) {
    await p.goto(process.env.BASE_URL, {timeout: 120000});
  }
  await p.waitForTimeout(500);
  await addFPSCounter(p);
  await runFPSCounter(p);
  await navigateToStudioFeed(p);
  const navigationTimingData = await getNavigationTimingData(p);
  readings.timeToFirstByte = navigationTimingData[0].responseStart - navigationTimingData[0].fetchStart;
  readings.timeToInteractive = navigationTimingData[0].domInteractive - navigationTimingData[0].fetchStart;
  readings.timeToLoadPage = navigationTimingData[0].loadEventEnd - navigationTimingData[0].fetchStart;
  const paintTimingData = await getPaintTimingData(p);
  readings.firstPaint = paintTimingData.find((element) => element.name === 'first-paint')?.startTime;
  readings.firstContentfulPaint = paintTimingData.find((element) => element.name === 'first-contentful-paint')?.startTime;
  readings.largestContentfulPaint = await getLargestContentfulPaintData(p);
  readings.blockingTime = await getBlockingTimeData(p);
  await p.waitForTimeout(2000);
  const fpsCounterData = await getFPSCounterData(p);
  readings.averageLoadFPS = fpsCounterData.averageFps;
  readings.minLoadFPS = fpsCounterData.minFps;
  readings.maxLoadFPS = fpsCounterData.maxFps;
  await clearFPSCounter(p);
  await p.waitForSelector('#studio_feed_wrapper');
  await p.waitForSelector('img[alt="rendernet_media"]');
  await autoScroll(p, maxScrolls);
  await p.waitForTimeout(2000);
  const fpsCounterDataScroll = await getFPSCounterData(p);
  readings.averageScrollFPS = fpsCounterDataScroll.averageFps;
  readings.minScrollFPS = fpsCounterDataScroll.minFps;
  readings.maxScrollFPS = fpsCounterDataScroll.maxFps;
  await clearFPSCounter(p);
  const imageLoadTimes = await getAllImageLoadTimes(p);
  await clearLoadTimes(p);
  readings.imageLoadTimeStats = calculateLoadTimeStats(imageLoadTimes);
  return readings;
}

test('Load and scroll studio feed media: Initial Load and Reload', async ({ page: p, browserName, isMobile }, testInfo) => {
  // const context = await mockAPis(browser);
  // const p = await context.newPage();
  // await mockAPis(p);
  console.log(`Running on: ${isMobile ? 'Mobile': 'Desktop'}, Browser: ${browserName === 'webkit' ? 'safari': browserName}`);
  await p.goto(process.env.BASE_URL+process.env.LOGIN_PATH, {
    timeout: 120000,
  });
  await increaseResourceTimingBufferSize(p);
  await p.waitForSelector('#email');
  await p.focus('#email');
  await p.keyboard.type(process.env.EMAIL);
  await p.focus('#password');
  await p.keyboard.type(process.env.PASSWORD);
  await p.click('#login-button');
  await p.waitForURL(process.env.BASE_URL);
  await p.waitForTimeout(500);


  const readingsJSON = {};

  readingsJSON[NavigationTypes.INITIAL] = await getStudioFeedLoadAndScrollReadings(p, NavigationTypes.INITIAL, 10);
  await p.waitForTimeout(1000);

  readingsJSON[NavigationTypes.RELOAD] = await getStudioFeedLoadAndScrollReadings(p, NavigationTypes.RELOAD, 10);
  console.log(readingsJSON);
  await testInfo.attach('performance readings', { body: readingsJSON, contentType: 'application/json' });
});

