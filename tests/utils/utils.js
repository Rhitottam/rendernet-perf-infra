const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const {expect} = require("@playwright/test");
const {mockSuccessTxtToImgGenerateResponse} = require("./mocks");

const loginUser = async (p) => {
  await p.goto(process.env.BASE_URL+process.env.LOGIN_PATH, {
    timeout: 120000,
  });
  if(Number(process.env.FEED_SIZE ?? 0)) {
   await p.evaluate((feedSize) => {
      localStorage.setItem('feedSize', feedSize);
      return feedSize
    }, process.env.FEED_SIZE);
    await p.reload();
  }
  // await increaseResourceTimingBufferSize(p);
  await p.waitForSelector('#email');
  await p.focus('#email');
  await p.keyboard.type(process.env.EMAIL);
  await p.focus('#password');
  await p.keyboard.type(process.env.PASSWORD);
  await p.click('#login-button');
  await p.waitForURL(process.env.BASE_URL);
  await p.waitForTimeout(500);
}

const autoScrollEval = async (p, maxScrolls) => {
  await p.evaluate(async (maxScrolls) => {
    await new Promise(async (resolve) => {
      let totalHeight = 0;
      let scrolls = 0;
      let scrollHeight, scrollTop;
      let lastTime = 0;
      let animationFrameId = null;
      let isRunning = true;  // Flag to control animation

      function scroll(currentTime) {
        if (!isRunning) {
          return;  // Exit if animation should stop
        }

        // Throttle to roughly match the original 1000ms interval
        if (currentTime - lastTime < 4000) {
          animationFrameId = requestAnimationFrame(scroll);
          return;
        }

        lastTime = currentTime;
        const studioFeed = document.getElementById('studio_feed_wrapper');

        if (studioFeed != null) {
          scrollHeight = studioFeed.scrollHeight;
          scrollTop = studioFeed.scrollTop;
          studioFeed.scrollTop += studioFeed.clientHeight;
          totalHeight += studioFeed.clientHeight;
          scrolls++;

          // stop scrolling if reached the end or the maximum number of scrolls
          if (scrolls >= maxScrolls || scrollTop === studioFeed.scrollTop) {
            cleanup();
            resolve();
            return;
          }

          animationFrameId = requestAnimationFrame(scroll);
        }
      }

      // Cleanup function to prevent memory leaks
      function cleanup() {
        isRunning = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        // Clear references
        scrollHeight = null;
        scrollTop = null;
        totalHeight = 0;
        scrolls = 0;
      }

      // Start the animation
      animationFrameId = requestAnimationFrame(scroll);

      // Add cleanup on page unload/navigation
      window.addEventListener('unload', cleanup, { once: true });
    });

  }, maxScrolls);

}

const autoScrollOnce = async (p) => {
    return await p.evaluate(async () => {
      return await new Promise(async (resolve) => {
        let totalHeight = 0;
        let scrolls = 0;  // scrolls counter
        let scrollHeight, scrollTop;
        const studioFeed = document.querySelector('#studio_feed_wrapper > div:nth-child(2)');

        if (studioFeed != null) {
          scrollTop = studioFeed.scrollTop;
          studioFeed.scrollTop += studioFeed.clientHeight;
          scrolls++;  // increment counter

          // stop scrolling if reached the end or the maximum number of scrolls
          if (scrollTop === studioFeed.scrollTop) {
            resolve(true);
          }
          else {
            resolve(false);
          }
        }
        resolve(false);
      });
    });
}

const autoScroll =  async (p, maxScrolls) => {
  let i = 0;
  console.log('scroll start');
  while(i<maxScrolls) {
    const isEnd = await autoScrollOnce(p);
    if(isEnd) {
      break;
    }
    i++;
    await p.waitForTimeout(2000);
  }
}

const autoScrollAlt =  async (p, maxScrolls) => {
  await p.evaluate(async (maxScrolls) => {
    await new Promise(async (resolve) => {
      let totalHeight = 0;
      let scrolls = 0;  // scrolls counter
      let scrollHeight, scrollTop;
      let timer = setInterval(() => {
        const studioFeed = document.getElementById('studio_feed_wrapper');

        if(studioFeed != null) {
          scrollHeight = studioFeed.scrollHeight;
          scrollTop= studioFeed.scrollTop;
          studioFeed.scrollTop += studioFeed.clientHeight;
          totalHeight += studioFeed.clientHeight;
          scrolls++;  // increment counter

          // stop scrolling if reached the end or the maximum number of scrolls
          if (scrolls >= maxScrolls || scrollTop === studioFeed.scrollTop ) {
            clearInterval(timer);
            resolve();
          }
        }
      }, 1000);
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

const calculateLoadTimeStatsFromMap = (loadTimeMap) => {
  if (!loadTimeMap || loadTimeMap.size === 0) {
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
  const times = [...loadTimeMap.values()];

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
    average: (average),
    median: (median),
    p95: Math.round(p95),
    p99: Math.round(p99),
    min: sortedTimes[0],
    max: sortedTimes[sortedTimes.length - 1],
    count: times.length
  };
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
      setTimeout(() => resolve(totalBlockingTime), 60000)
    })
  }, 0);

  return totalBlockingTime;
}


// const mockAPisWithContext = async (browser) => {
//   const context = await browser.newContext();
//   await context.route(/.*\.(png|webp)/, async route => {
//     await route.abort();
//   });
//   await context.route(/.*\/app\/v1\/media\/studio\/feed\?page=1&page_size=20\.*/,  async route => {
//     const json = feedData;
//     console.log('normal');
//     await route.abort();
//   });
//   await context.route('*/**/app/v1/media/studio/feed?page=2&page_size=20',  async route => {
//     const json = { data: [], err: {}};
//     await route.fulfill({ json });
//   });
//   await context.route(/.*\/app\/v1\/media\/studio\/feed\.*/, async route => {
//     const json = feedData;
//     console.log('absolute');
//     await route.fulfill({ json });
//   });
//   return context;
// }
//
// const mockAPis = async (page) => {
//   // const context = await browser.newContext();
//   await page.route(/.*\.(png|webp)/, async route => {
//     console.log('image')
//     await route.abort();
//   });
//   await page.route(/.*\/studio\/feed\?page=1&page_size=20\.*/,  async route => {
//     const json = feedData;
//     console.log('normal');
//     await route.abort();
//   });
// }

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
            window.localStorage.setItem('fps-measurements', JSON.stringify({ averageFps, minFps, maxFps, count: fpsCount }));
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
    window.localStorage.removeItem('fps-measurements');
  });
}

const getFPSCounterData = async (page) => {
  return await page.evaluate(() => {
    return JSON.parse(window.localStorage.getItem('fps-measurements') ?? '{}');
  });
}

// beforeEach(async ({ page: p, browser }) => {
//   await mockAPis(browser);
// });

const NavigationTypes = {
  INITIAL: 'initial',
  RELOAD: 'reload',
}

const performZoomIn = async (p, count= 1) => {
  for (let i=0;i<count;i++) {
    // await p.waitForSelector('#canvas-zoom-in-tool');
    await p.keyboard.down('Control');
    await p.mouse.wheel(0, -200);
    await p.mouse.wheel(0, -200);
    await p.keyboard.up('Control');
    // await p.click('#canvas-zoom-in-tool');
    // await p.waitForTimeout(1000);
  }
}

const performZoomOut = async (p, count = 1) => {
  for (let i=0;i<count;i++) {
    // await p.waitForSelector('#canvas-zoom-out-tool');
    // await p.click('#canvas-zoom-out-tool');
    // await p.waitForTimeout(1000);
    await p.keyboard.down('Control');
    await p.mouse.wheel(0, 200);
    await p.mouse.wheel(0, 200);
    await p.keyboard.up('Control');
  }
}

const performBasicCanvasOperations = async (p, start, count=1) => {
  for (let i=0;i<count;i++) {
    await performZoomIn(p, 2);
    await p.mouse.move(start[0], start[1], {steps: 2});
    await performPan(p, start, [-400, 0]);
    // await addTimeout(2000);
    await performPan(p, start, [400, 0]);
    // await addTimeout(2000);
    await performPan(p, start, [0, -200]);
    // await addTimeout(2000);
    await performPan(p, start, [0, 200]);
    await performZoomOut(p, 2);
    await p.mouse.move(start[0], start[1], {steps: 2});
    await performPan(p, start, [-200, 0]);
    // await addTimeout(2000);
    await performPan(p, start, [200, 0]);
    // await addTimeout(2000);
    await performPan(p, start, [0, -100]);
    // await addTimeout(2000);
    await performPan(p, start, [0, 100]);
  }
}

const performPan = async (p, move, diff, count = 1) => {
  for (let i=0;i<count;i++) {
    await p.keyboard.down('Space');
    await p.mouse.down({
      button: 'left',
    });
    await p.mouse.move(move[0] + diff[0], move[1] + diff[1], {steps: 2});
    await p.mouse.up({
      button: 'left',
    });
    await p.mouse.move(move[0], move[1], {steps: 1});
    await p.keyboard.up('Space');
    await p.waitForTimeout(1000);
  }
}

const checkForCanvasImagesCompletion = async (p) => {
  return await p.evaluate(() => {
    return new Promise((cb, reject) => {
      const canvasImageShapes = document.querySelectorAll('div[data-shape-type="canvas-image"]');
      const completedCanvasImageShapes = Array.from(canvasImageShapes ?? []).filter((imageShape) => {
        const images = imageShape.getElementsByTagName('img');
        return Array.from(images ?? []).every((image) => {
          return image?.src?.length &&
          !image?.src?.includes('static/media/transparent-square')
        });
      });
      if (canvasImageShapes?.length === completedCanvasImageShapes?.length) {
        cb({
          isComplete: true,
          ratio: completedCanvasImageShapes.length/canvasImageShapes.length,
          total: canvasImageShapes.length
        });
      }
      else {
        cb({
          isComplete: false,
          ratio: completedCanvasImageShapes.length/canvasImageShapes.length,
          total: canvasImageShapes.length
        });
      }
    });
  });
}

const periodicCheckForCanvasImagesCompletionLoop = async (p) => {
  const startTime = performance.now();
  let currentRatio = 1;
  while(true) {
    const data = await checkForCanvasImagesCompletion(p);
    const {isComplete, ratio} = data ?? {};
    if(isComplete) {
      break;
    }
    else {
      await p.waitForTimeout(2000);
    }
    if(performance.now() - startTime > 600000) {
      currentRatio = ratio;
      break;
    }
  }
  const endTime = performance.now();
  return {
    time: endTime - startTime,
    percentage: Number(currentRatio * 100).toFixed(2),
  };
}

const periodicCheckForCanvasImagesCompletion = async (p) => {
  return await p.evaluate(() => {
    return new Promise((resolve) => {
      const startLoadTime = performance.now();
      let animationFrameId = null;
      let isRunning = true;
      let lastTime = 0;

      function checkForImages(currentTime) {
        if (!isRunning) {
          return;
        }

        // Throttle to match original 500ms interval
        if (currentTime - lastTime < 500) {
          animationFrameId = requestAnimationFrame(checkForImages);
          return;
        }

        lastTime = currentTime;
        const canvasImageShapes = document.querySelectorAll('div[data-shape-type="canvas-image"]');
        const completedCanvasImageShapes = Array.from(canvasImageShapes ?? []).filter((imageShape) => {
          const images = imageShape.getElementsByTagName('img');
          return Array.from(images ?? []).every((image) => image?.src?.length);
        });

        if (canvasImageShapes?.length === completedCanvasImageShapes?.length) {
          cleanup();
          resolve(performance.now() - startLoadTime);
          return;
        }


        animationFrameId = requestAnimationFrame(checkForImages);
      }

      function cleanup() {
        isRunning = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
      // Start the animation
      animationFrameId = requestAnimationFrame(checkForImages);

      // Add cleanup on page unload
      window.addEventListener('unload', cleanup, { once: true });
    });
  });
}

const periodicCheckForCanvasImagesCompletionAlt = async (p) => {
  return await p.evaluate(() => {
    return new Promise((resolve) => {
      let canvasImageShapes, completedCanvasImageShapes;
      const startLoadTime = performance.now();
      const checkForImages = setInterval(() => {
        canvasImageShapes = document.querySelectorAll('div[data-shape-type="canvas-image"]');
        completedCanvasImageShapes = Array.from(canvasImageShapes ?? []).filter((imageShape) => {
          const images = imageShape.getElementsByTagName('img');
          return Array.from(images ?? []).every((image) => image?.src?.length);
        });
        if (canvasImageShapes?.length === completedCanvasImageShapes?.length) {
          clearInterval(checkForImages);

          resolve(performance.now() - startLoadTime);
        }
      }, 500);
    });
  });
}

const constructInitialReadingsJson = (isMobile, browserName) => {
  return {
    browser: browserName === 'webkit' ? 'safari' : browserName,
    isMobile,
    label: `${isMobile ? 'Mobile' : 'Desktop'} - ${browserName === 'webkit' ? 'safari' : browserName}`,
  };
}

const createPerformanceTestReadingsJSON = (label, readings) => {
  const resultsDir = path.join(__dirname, 'test-readings');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Write JSON file
  const date = new Date();
  const dateString = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replaceAll('/', '-');
  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h24',
  }).replaceAll(/[\/:\s]/g, '-');

  const fileName = `test-data|${label}|${process.env.BASE_URL.split(/https?:\/\//)[1].split(/\//)[0]}|${dateString}|${timeString}|${process.env.FEED_SIZE ?? 500}|.json`;
  const filePath = path.join(resultsDir, fileName);

  fs.writeFileSync(
    filePath,
    JSON.stringify(readings, null, 2), // The '2' parameter adds pretty formatting
    'utf-8'
  );
}

const isGeneratedMediaUrl = (url) => {
  // Match webp, png, or mp4 extensions and optional user[-_]generated pattern
  const mediaPattern = /.*(user[-_]generated|flux-images|thumbnail).*\.(webp|png|mp4)($|\?)/i;
  return mediaPattern.test(url);
};

const handleServiceWorkerRequest = async (route) => {
  try {
    // Get the original response
    const response = await route.fetch();
    const originalContent = await response.text();

    // Modify the content
    let modifiedContent = originalContent
      .replace('/* COMMENTED FOR TESTS', '')
      .replace('COMMENTED FOR TESTS */', '');

    console.log('Service worker modified');

    // Fulfill with modified content
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: modifiedContent,
      headers: response.headers() // Preserve original headers
    });
  } catch (error) {
    console.error('Error handling service worker request:', error);
    await route.continue();
  }
}
const webSocketData = {};
const mockWebsocket = async (page) => {

  await page.routeWebSocket('wss://ws-mt1.pusher.com/app/c3fb4c2d6c2e4490eb31?protocol=7&client=js&version=8.3.0&flash=false', ws => {
    // ws.send('{"event":"pusher:subscribe","data":{"channel":"private-studio-1>>>>>"}}');
    webSocketData.ws = ws;
    console.log('on Websocket');
    const server = ws.connectToServer();
    webSocketData.server = server;
    ws.onMessage(message => {
      console.log('Web SOCKET MESSAGE', message);
      const messageData = JSON.parse(message);
      if (messageData.event === "pusher:subscribe") {
        webSocketData.channel = messageData.data.channel;
      }
      server.send(message);
    });
    server.onMessage(message => {
      console.log('Web SOCKET SERVER MESSAGE', message);
      ws.send(message);
    });
  });
}

const mockErrorStudioGenerationFlow = async (page, context) => {
  await context.route('**/*', async (route) => {
    const json = {
      data: {},
      err: {
        code: '100',
        message: 'Testing Error Generations'
      }
    }
    console.log('Route fulfilled', route.request().method(), route.request().url());
    await route.continue();
  })
  // console.log('Service worker mocking');
  // await page.addInitScript(() => {
  //   window.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = 1;
  // })
  // page.context().on('serviceworker', async (sw) => {
  //   console.log('Service Worker Registered: ', sw?.url());
  //   const serviceWorkerURl = sw?.url();
  //   if(serviceWorkerURl.includes('sw-v1.0.2.js')) {
  //     // await page.context().waitForEvent('request', r => r.url().endsWith('/sw-v1.0.2.js'));
  //     // await page.context().route('**/sw-v1.0.2.js', handleServiceWorkerRequest);
  //     // sw.route
  //     // await sw.route(serviceWorkerURl, handleServiceWorkerRequest);
  //   }
  //   // await sw.route(sw.url)
  // });
  // await page.context().waitForEvent('request', r => r.url().endsWith('/sw-v1.0.2.js'));
  await context.route('**/sw-v1.0.2.js', handleServiceWorkerRequest);
}

const studioFeedGenerationErrorFlow = async (page) => {
  const startTime = performance.now();
  const requestPromise = page.waitForRequest(/.*\/v1\/media\/studio\/generate/);
  await page.waitForURL(`${process.env.BASE_URL}/app/text-to-image`.replaceAll(/\/+/g,'/'), {
    waitUntil: "load"
  });
  const request = await requestPromise;
  const response = await page.waitForResponse(/.*\/v1\/media\/studio\/generate/);
  await expect(request).toBeTruthy();
  const requestData = JSON.parse(request.postData());
  // await generationDataAssertions(requestData);
  // await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  const responseData = await response.json();
  console.log(responseData);
  const generationApiTime =  request.timing().responseEnd;
}

const studioFeedMusicVideoGenerationFlow = async (page, generationDataAssertions) => {
  const startTime = performance.now();
  const requestPromise = page.waitForRequest(/.*\/v1\/media\/studio\/generate/);
  await page.waitForURL(`**/app/text-to-image`, {
    waitUntil: "load"
  });
  const request = await requestPromise;
  const response = await page.waitForResponse(/.*\/v1\/media\/studio\/generate/);
  await expect(request).toBeTruthy();
  const requestData = JSON.parse(request.postData());
  await generationDataAssertions(requestData);
  // await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  const responseData = await response.json();
  const generationApiTime =  request.timing().responseEnd;
  const generationId = responseData.data.generation_id;
  const mediaId1 = responseData.data.media[0].media_id;
  await page.waitForSelector(`#generations-wrapper-generation-${generationId}`);
  const generationLoaderShownTime = performance.now();
  await expect (await page.locator(`#generations-wrapper-generation-${generationId}`)).toBeVisible();
  await expect (await page.locator(`#music-video-in-progress-loader-${generationId}-${mediaId1}`)).toBeVisible();
  const resumeGenerationButtonSelector = `#view-music-video-progress-button-${generationId}-${mediaId1}`
  await expect(page.locator(resumeGenerationButtonSelector)).toBeAttached();
  await page.waitForSelector('#music-video-scenes-modal-container', {
    state: 'visible',
  });
  const musicVideoModalShownTime = performance.now();
  const locators = await page.locator('.music-video-thumbnails-loader').all();
  await Promise.all(locators.map(locator => expect(locator).toBeHidden({
    timeout: 120_000,
  })));

  await expect(page.locator('#music-video-modal-generate-button')).toBeEnabled();
  await page.locator('#music-video-modal-generate-button').click();
  const scenesCompletionTime = performance.now();

  await page.waitForSelector('#music-video-scenes-modal-container', {
    state: 'hidden',
  });
  await expect(page.locator('#music-video-scenes-modal-container')).toBeHidden();
  await page.waitForSelector(`#generations-wrapper-generation-${generationId} .music-video-loader`);
  const musicVideoFinalLoaderShownTime = performance.now();
  const exportButtonSelector = `#generation-${generationId}-${mediaId1}-${mediaId1} #${mediaId1}-download-button`
  let isGenerationComplete = false;
  try {
    await page.waitForSelector(
      exportButtonSelector,
      {
        timeout: 300_000,
        state: 'attached',
      }
    );
    await expect(page.locator(exportButtonSelector)).toBeAttached();
    isGenerationComplete = true;
  }
  catch (e) {
    isGenerationComplete = false;
  }
  const fpsCounterData = await getFPSCounterData(page);
  const generationCompleteTime = performance.now();
  return {
    initial: {
      totalDuration: generationCompleteTime - startTime,
      apiDuration: generationApiTime,
      loaderShownUIDuration: generationLoaderShownTime - generationApiTime - startTime,
      musicVideoModalShownDuration: musicVideoModalShownTime - startTime,
      scenesCompletionDuration: scenesCompletionTime - musicVideoModalShownTime,
      musicVideoFinalLoaderShownDuration: musicVideoFinalLoaderShownTime - scenesCompletionTime,
      generationPusherEventDelay: generationCompleteTime - musicVideoFinalLoaderShownTime,
      isGenerationComplete,
      e2eTestsPassed: true,
      ...fpsCounterData,
    },
  };
}


const studioFeedGenerationFlow = async (page, generationDataAssertions) => {
  const startTime = performance.now();
  const requestPromise = page.waitForRequest(/.*\/v1\/media\/studio\/generate/);
  await page.waitForURL(`**/app/text-to-image`, {
    waitUntil: "load"
  });
  const request = await requestPromise;
  const response = await page.waitForResponse(/.*\/v1\/media\/studio\/generate/);
  await expect(request).toBeTruthy();
  const requestData = JSON.parse(request.postData());
  await generationDataAssertions(requestData);
  // await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  const responseData = await response.json();
  const generationApiTime =  request.timing().responseEnd;
  const generationId = responseData.data.generation_id;
  const mediaId1 = responseData.data.media[0].media_id;
  await page.waitForSelector(`#generations-wrapper-generation-${generationId}`);
  const generationLoaderShownTime = performance.now();
  await expect (await page.locator(`#generations-wrapper-generation-${generationId}`)).toBeVisible();
  await expect (await page.locator(`#generation-${generationId}-${mediaId1}-${mediaId1}`)).toBeVisible();
  const exportButtonSelector = `#generation-${generationId}-${mediaId1}-${mediaId1} #${mediaId1}-download-button`
  let isGenerationComplete = false;
  try {
    await page.waitForSelector(
      exportButtonSelector,
      {
        timeout: 300_000,
        state: 'attached',
      }
    );
    await expect(page.locator(exportButtonSelector)).toBeAttached();
    isGenerationComplete = true;
  }
  catch (e) {
    isGenerationComplete = false;
  }
  const fpsCounterData = await getFPSCounterData(page);
  const generationCompleteTime = performance.now();
  return {
    initial: {
        totalDuration: generationCompleteTime - startTime,
        apiDuration: generationApiTime,
        loaderShownUIDuration: generationLoaderShownTime - generationApiTime - startTime,
        generationShownUIDuration: generationCompleteTime - generationApiTime - startTime,
        generationPusherEventDelay: generationCompleteTime - generationLoaderShownTime,
        e2eTestsPassed: true,
        isGenerationComplete,
        ...fpsCounterData,
      },
  };
}

const ASSET_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
}

const uploadAssetIntoAssetLibraryAndSelect = async (
  page,
  isMobile,
  placeholderSelector,
  mediaSelector = null,
  type = ASSET_TYPES.IMAGE
) => {
  await expect(page.locator(placeholderSelector)).toBeVisible();
  await page.locator(placeholderSelector).click();
  if(mediaSelector) {
    await expect(page.locator(mediaSelector)).toBeHidden();
  }
  await page.waitForSelector('#asset-library-grid-section');
  await expect(page.locator('#asset-library-grid-section')).toBeVisible();
  if(type === ASSET_TYPES.IMAGE) {
    await page.waitForSelector('#asset-library-upload-section-body');
    await page.waitForSelector('#asset-library-upload-image');
    await page.locator('#asset-library-upload-section-body').click();
    await page.locator('#img-upload-input').setInputFiles(path.join(__dirname, 'assets', 'image-asset.png'));
  }
  else if(type === ASSET_TYPES.VIDEO) {
    await page.waitForSelector('#video-asset-upload-section-body');
    await page.waitForSelector('#asset-library-upload-image');
    // await page.locator('#video-asset-upload-section-body').click();
    await page.locator('#video-upload-input').setInputFiles(path.join(__dirname, 'assets', 'video-asset.mp4'));
  }
  else if(type === ASSET_TYPES.AUDIO) {
    await page.waitForSelector('#audio-asset-upload-section-body');
    await page.waitForSelector('#asset-library-upload-image');
    await page.locator('#audio-asset-upload-section-body').click();
    await page.locator('#audio-upload-input').setInputFiles(path.join(__dirname, 'assets', 'audio-asset.mp3'));
  }

  await page.waitForSelector('#asset-library-grid-grid', { state: 'hidden'});
  await expect(page.locator('#asset-library-grid-grid')).toBeHidden();
  if(mediaSelector) {
    await expect(page.locator(mediaSelector)).toBeVisible();
  }
  await expect(page.locator(placeholderSelector)).toBeHidden();
}

const uploadImageAssetIntoAssetLibraryAndSelect = async (page, isMobile, placeholderSelector, mediaSelector, type) => {
  await uploadAssetIntoAssetLibraryAndSelect(page, isMobile, placeholderSelector, mediaSelector, ASSET_TYPES.IMAGE);
}
const uploadVideoAssetIntoAssetLibraryAndSelect = async (page, isMobile, placeholderSelector, mediaSelector, type) => {
  await uploadAssetIntoAssetLibraryAndSelect(page, isMobile, placeholderSelector, mediaSelector, ASSET_TYPES.VIDEO);
}
const uploadAudioAssetIntoAssetLibraryAndSelect = async (page, isMobile, placeholderSelector, mediaSelector, type) => {
  await uploadAssetIntoAssetLibraryAndSelect(page, isMobile, placeholderSelector, mediaSelector, ASSET_TYPES.AUDIO);
}

const selectImageAssetFromAssetLibrary = async (page, isMobile, placeholderSelector, imageSelector) => {
  await expect(page.locator(placeholderSelector)).toBeVisible();
  await page.locator(placeholderSelector).click();
  await page.waitForSelector('#asset-library-grid-section');
  await expect(page.locator('#asset-library-grid-section')).toBeVisible();
  const firstAssetSelector = '#asset-library-grid-grid > div.asset-library-grid-item:nth-child(2)';
  await page.waitForSelector(firstAssetSelector);
  if(!isMobile) {
    await page.locator(firstAssetSelector).hover();
  }
  await expect(page.locator(`${firstAssetSelector} div.hoverWrapper`)).toBeVisible();
  await page.locator(`${firstAssetSelector} div.hoverWrapper`).click();
  await page.waitForSelector(imageSelector);
  await expect(page.locator('#asset-library-grid-grid')).toBeHidden();
  await expect(page.locator(imageSelector)).toBeVisible();
  await expect(page.locator(placeholderSelector)).toBeHidden();
}

const handleGenerationRouting = async (page, context, mockResponse, options = { isError: false }) => {
  const browserType = context.browser()?.browserType().name();
  const isWebKit = browserType === 'webkit';

  // Common route handler for generation endpoints
  const handleGenerateRequest = async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Only intercept POST requests to generate endpoints
    if (method === 'POST' && url.includes('/generate')) {
      console.log(`Intercepting generation request for ${browserType}:`, url);
      await route.fulfill({
        status: options.isError ? 400 : 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    } else {
      await route.continue();
    }
  };

  // WebKit-specific service worker modification
  const handleServiceWorkerRequest = async (route) => {
    try {
      const response = await route.fetch();
      const originalContent = await response.text();

      // Add the mock response to the service worker
      const mockResponseString = JSON.stringify(mockResponse);
      const swInterceptCode = `
        // Mock generation response
        const mockResponse = ${mockResponseString};
        
        // Intercept fetch requests
        self.addEventListener('fetch', (event) => {
          if (event.request.method === 'POST' && event.request.url.includes('/generate')) {
            event.respondWith(
              new Response(JSON.stringify(mockResponse), {
                status: ${options.isError ? 400 : 200},
                headers: { 'Content-Type': 'application/json' }
              })
            );
          }
        });
      `;

      const modifiedContent = originalContent + '\n' + swInterceptCode;

      await route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: modifiedContent,
        headers: response.headers()
      });

      console.log('Service worker modified for WebKit');
    } catch (error) {
      console.error('Error handling service worker request:', error);
      await route.continue();
    }
  };

  if (isWebKit) {
    // For WebKit, modify the service worker and set up route handling
    await context.route('**/sw*.js', handleServiceWorkerRequest);

    // Wait for service worker to be installed
    // await page.waitForFunction(() => {
    //   return navigator.serviceWorker && navigator.serviceWorker.controller;
    // });
  } else {
    // For other browsers, just set up route handling
    await context.route('**/*', handleGenerateRequest);
  }
};

module.exports = {
  autoScroll,
  autoScrollAlt,
  getAllImageLoadTimes,
  clearLoadTimes,
  calculateLoadTimeStatsFromMap,
  getNavigationTimingData,
  increaseResourceTimingBufferSize,
  getResourceObservedData,
  getImageResourceTimingData,
  getPaintTimingData,
  getLargestContentfulPaintData,
  getBlockingTimeData,
  addFPSCounter,
  runFPSCounter,
  clearFPSCounter,
  getFPSCounterData,
  loginUser,
  NavigationTypes,
  performZoomIn,
  performZoomOut,
  performBasicCanvasOperations,
  performPan,
  checkForCanvasImagesCompletion,
  periodicCheckForCanvasImagesCompletion,
  periodicCheckForCanvasImagesCompletionAlt,
  periodicCheckForCanvasImagesCompletionLoop,
  constructInitialReadingsJson,
  createPerformanceTestReadingsJSON,
  isGeneratedMediaUrl,
  studioFeedGenerationFlow,
  selectImageAssetFromAssetLibrary,
  uploadImageAssetIntoAssetLibraryAndSelect,
  mockErrorStudioGenerationFlow,
  studioFeedGenerationErrorFlow,
  handleGenerationRouting,
  mockWebsocket,
  webSocketData,
  uploadVideoAssetIntoAssetLibraryAndSelect,
  uploadAudioAssetIntoAssetLibraryAndSelect,
  studioFeedMusicVideoGenerationFlow
};