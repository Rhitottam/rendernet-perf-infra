// @ts-check
const { test, beforeEach, beforeAll } = require('@playwright/test');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  addFPSCounter,
  runFPSCounter,
  NavigationTypes,
  getNavigationTimingData,
  getPaintTimingData,
  getLargestContentfulPaintData,
  getBlockingTimeData,
  getFPSCounterData,
  clearFPSCounter,
  autoScroll,
  getAllImageLoadTimes,
  clearLoadTimes,
  calculateLoadTimeStats,
  increaseResourceTimingBufferSize, createPerformanceTestReadingsJSON, constructInitialReadingsJson,

} = require("./utils/utils");

const navigateToStudioFeed = async (p) => {
  await p.waitForSelector('#navbar-container');
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
  await p.waitForTimeout(5000);
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
  await p.waitForTimeout(3000);
  const imageLoadTimes = await getAllImageLoadTimes(p);
  readings.imageLoadTimeStats = calculateLoadTimeStats(imageLoadTimes);
  await clearLoadTimes(p);
  await p.waitForTimeout(3000);
  return readings;
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

test('Load and scroll studio feed media: Initial Load and Reload', async ({ page: p, browserName, isMobile }, testInfo) => {
  test.slow();
  console.log(`Running on: ${isMobile ? 'Mobile': 'Desktop'}, Browser: ${browserName === 'webkit' ? 'safari': browserName}`);
  const maxNumberOfScrolls = 1000;
  const readingsJSON = constructInitialReadingsJson(isMobile, browserName);
  readingsJSON[NavigationTypes.INITIAL] = await getStudioFeedLoadAndScrollReadings(p, NavigationTypes.INITIAL, maxNumberOfScrolls);
  const serviceWorkerUnregisterStatus = await p.evaluate(async () => {
    return await navigator.serviceWorker.getRegistration().then(function(registration) {
      return registration.unregister();
    });
  });
  console.log('ServiceWorker Unregister Status', serviceWorkerUnregisterStatus);
  await p.reload();
  readingsJSON[NavigationTypes.RELOAD] = await getStudioFeedLoadAndScrollReadings(p, NavigationTypes.RELOAD, maxNumberOfScrolls);
  console.log(readingsJSON);
  test.info().annotations.push({
    type: `Studio Feed Load Tests - ${readingsJSON.label}`,
    description: 'Load and scroll studio feed media: Initial Load and Reload',
    performanceTestReadings: readingsJSON
  });
  createPerformanceTestReadingsJSON(`studio-feed-performance`, readingsJSON);
  await testInfo.attach(`studio-feed-performance-test readings-${readingsJSON.label}`, { body: JSON.stringify(readingsJSON), contentType: 'application/json' });
});
