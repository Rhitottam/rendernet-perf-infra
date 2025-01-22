const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
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
        const studioFeed = document.getElementById('studio_feed_wrapper');

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
  while(i<maxScrolls) {
    const isEnd = await autoScrollOnce(p);
    if(isEnd) {
      break;
    }
    console.log('scrolling... ', i);
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
        return Array.from(images ?? []).every((image) => image?.src?.length);
      });
      if (canvasImageShapes?.length <= completedCanvasImageShapes?.length + 20) {
        cb({isComplete: true, ratio: `${completedCanvasImageShapes.length}/${canvasImageShapes.length}`});
      }
      else {
        cb({isComplete: false, ratio: `${completedCanvasImageShapes.length}/${canvasImageShapes.length}`});
      }
    });
  });
}

const periodicCheckForCanvasImagesCompletionLoop = async (p) => {
  const startTime = performance.now();
  while(true) {
    const data = await checkForCanvasImagesCompletion(p);
    const {isComplete} = data ?? {};
    if(isComplete) {
      break;
    }
    else {
      await p.waitForTimeout(2000);
    }
  }
  const endTime = performance.now();
  return endTime - startTime;
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
  const fileName = `test-data-${label}-${process.env.BASE_URL.split(/https?:\/\//)[1].split(/\//)[0]}-${(new Date().toUTCString().replaceAll(/\s+/g, '-'))}.json`;
  const filePath = path.join(resultsDir, fileName);

  fs.writeFileSync(
    filePath,
    JSON.stringify(readings, null, 2), // The '2' parameter adds pretty formatting
    'utf-8'
  );
}

module.exports = {
  autoScroll,
  autoScrollAlt,
  getAllImageLoadTimes,
  clearLoadTimes,
  calculateLoadTimeStats,
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
  createPerformanceTestReadingsJSON
};