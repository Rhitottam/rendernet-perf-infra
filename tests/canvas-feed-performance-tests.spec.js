const {test, beforeEach} = require("@playwright/test");
const {
  addFPSCounter,
  clearFPSCounter, constructInitialReadingsJson, createPerformanceTestReadingsJSON, getBlockingTimeData,
  getFPSCounterData,
  getLargestContentfulPaintData, getNavigationTimingData, getPaintTimingData, NavigationTypes,
  performBasicCanvasOperations, periodicCheckForCanvasImagesCompletionLoop, runFPSCounter,
  increaseResourceTimingBufferSize
} = require("./utils/utils.js");

const getCanvasFeedAndPerformOperations = async (p, navigationType, operationsRepeat= 1) => {
  const readings = {}
  if(navigationType === NavigationTypes.INITIAL) {
    await p.waitForURL(process.env.BASE_URL);
  }
  else if(navigationType === NavigationTypes.RELOAD) {
    await p.goto(process.env.BASE_URL, {timeout: 120000});
  }
  await p.waitForTimeout(500);
  await addFPSCounter(p);
  await runFPSCounter(p);
  await navigateToCanvasPage(p);
  const navigationTimingData = await getNavigationTimingData(p);
  readings.timeToFirstByte = navigationTimingData[0].responseStart - navigationTimingData[0].fetchStart;
  readings.timeToInteractive = navigationTimingData[0].domInteractive - navigationTimingData[0].fetchStart;
  readings.timeToLoadPage = navigationTimingData[0].loadEventEnd - navigationTimingData[0].fetchStart;
  const paintTimingData = await getPaintTimingData(p);
  readings.firstPaint = paintTimingData.find((element) => element.name === 'first-paint')?.startTime;
  readings.firstContentfulPaint = paintTimingData.find((element) => element.name === 'first-contentful-paint')?.startTime;
  readings.largestContentfulPaint = await getLargestContentfulPaintData(p);
  readings.blockingTime = await getBlockingTimeData(p);
  await p.waitForTimeout(10000);
  await p.waitForSelector('#cross-button');
  await p.click('#cross-button');
  const fpsCounterData = await getFPSCounterData(p);
  readings.averageLoadFPS = fpsCounterData.averageFps;
  readings.minLoadFPS = fpsCounterData.minFps;
  readings.maxLoadFPS = fpsCounterData.maxFps;
  await clearFPSCounter(p);
  readings.canvasImageLoadTime = await periodicCheckForCanvasImagesCompletionLoop(p);
  const e = await p.$('.tl-canvas');
  const box = await e.boundingBox();
  const point = [box.x + box.width / 2, box.y + box.height / 2];
  await performBasicCanvasOperations(p, point, operationsRepeat);
  const fpsCounterDataCanvasOperations = await getFPSCounterData(p);
  readings.averageCanvasOperationFPS = fpsCounterDataCanvasOperations.averageFps;
  readings.minCanvasOperationFPS = fpsCounterDataCanvasOperations.minFps;
  readings.maxCanvasOperationFPS = fpsCounterDataCanvasOperations.maxFps;
  await clearFPSCounter(p);
  return readings;
}
const navigateToCanvasPage = async (p) => {
  await p.waitForSelector('#navbar-container');
  try {
    await p.waitForSelector('a[href="/app/canvases"]', {
      timeout: 1000,
    });
  }
  catch (e) {
    await p.click('#mobile-menu-button');
    await p.waitForSelector('a[href="/app/canvases"]', {
      timeout: 1000,
    });
  }
  await p.click('a[href="/app/canvases"]');
  await p.waitForSelector('#canvas-image-wrapper');
  await p.click('#canvas-image-wrapper');
}
beforeEach(async ({ page: p }) => {
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
})
test('Load and perform pan and zoom operations on Canvas: Initial and Reload', async({page: p, browserName, isMobile}, testInfo) => {
  test.slow();
  test.skip(isMobile, 'Canvas testing only for Desktop devices');
  console.log(`Running on: ${isMobile ? 'Mobile': 'Desktop'}, Browser: ${browserName === 'webkit' ? 'safari': browserName}`);
  const numberOfBasicOperationRepetitions = 2;
  const readingsJSON = constructInitialReadingsJson(isMobile, browserName);
  readingsJSON[NavigationTypes.INITIAL] = await getCanvasFeedAndPerformOperations(p, NavigationTypes.INITIAL, numberOfBasicOperationRepetitions);
  await p.waitForTimeout(1000);
  readingsJSON[NavigationTypes.RELOAD] = await getCanvasFeedAndPerformOperations(p, NavigationTypes.RELOAD, numberOfBasicOperationRepetitions);
  console.log(readingsJSON);
  test.info().annotations.push({
    type: `Infinite Canvas Feed Load Tests - ${readingsJSON.label}`,
    description: 'Load and perform pan and zoom operations on Canvas: Initial and Reload',
    performanceTestReadings: readingsJSON
  });

  createPerformanceTestReadingsJSON(`canvas-feed-performance-test-readings`, readingsJSON);
  await testInfo.attach(`canvas-feed-performance-test-readings-${readingsJSON.label}`, { body: JSON.stringify(readingsJSON), contentType: 'application/json' });
});