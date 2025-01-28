const { test } = require("@playwright/test");
const playwright  = require("playwright");
const { loginUser, createPerformanceTestReadingsJSON } = require("./utils/utils");

const requiredAuditMetrics = ['first-contentful-paint', 'largest-contentful-paint',
  'speed-index', 'total-blocking-time', 'interactive',
  'bootup-time'];

const auditMetricsLabelMap = {
  'first-contentful-paint': 'firstContentfulPaint',
  'largest-contentful-paint': 'largestContentfulPaint',
  'speed-index': 'speedIndex',
  'total-blocking-time': 'blocking Time',
  'interactive': 'timeToInteractive',
  'bootup-time': 'bootupTime',
}

test('Run Lighthouse audit on initial load and reload of Studio feed', async () => {
  const lighthouse =  await import("lighthouse");
  // console.log('light house imported', lighthouse);
  const browser = await playwright['chromium'].launch({
    args: ['--remote-debugging-port=9222'],
  });
  const p = await browser.newPage();
  await loginUser(p);
  const { lhr } = await lighthouse.default(
    process.env.BASE_URL + process.env.TEXT_TO_IMAGE_PATH,
    { port: 9222 },
    null
  );
  const initial = Object.keys(lhr.audits).filter(key => requiredAuditMetrics.includes(key)).reduce((acc, key) => {
    return {
      ...acc,
      [auditMetricsLabelMap[key]]: lhr.audits[key].numericValue,
    }
  }, {});
  const { lhr: lhrReload } = await lighthouse.default(
    process.env.BASE_URL + process.env.TEXT_TO_IMAGE_PATH,
    { port: 9222 },
    null
  );
  const reload = Object.keys(lhrReload.audits).filter(key => requiredAuditMetrics.includes(key)).reduce((acc, key) => {
    return {
      ...acc,
      [auditMetricsLabelMap[key]]: lhrReload.audits[key].numericValue,
    }
  }, {});
  const readingsJSON = { initial, reload };
  console.log(readingsJSON);
  createPerformanceTestReadingsJSON(`studio-feed-lighthouse-metrics`, readingsJSON);
});