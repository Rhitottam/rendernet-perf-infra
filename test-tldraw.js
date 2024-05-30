const pt = require('puppeteer');
const tracealyzer = require('tracealyzer');

const performZoomIn = async (p, count= 1) => {
  for (let i=0;i<count;i++) {
    await p.waitForSelector('#canvas-zoom-in-tool');
    await p.click('#canvas-zoom-in-tool');
  }
}

const performZoomOut = async (p, count = 1) => {
  for (let i=0;i<count;i++) {
    await p.waitForSelector('#canvas-zoom-out-tool');
    await p.click('#canvas-zoom-out-tool');
  }
}

const addTimeout = async (timeout) => {
  await new Promise(resolve => setTimeout(resolve, timeout));
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
  }
}

const performBasicOperations = async (p, start) => {
  await performZoomIn(p, 2);
  await p.mouse.move(start[0], start[1], {steps: 1});
  await addTimeout(5000);
  await performPan(p, start, [-500, 0]);
  await addTimeout(3000);
  await performPan(p, start, [500, 0]);
  await addTimeout(3000);
  await performPan(p, start, [500, 0]);
  await addTimeout(3000);
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
  slowMo: 50,
  ignoreDefaultArgs: igrDefaultArgs,
  defaultViewport: null, // Launch page in max resolution and disables defaults to an 800x600 viewport
  devtools: false,
  ignoreHTTPSErrors: true,
};
pt.launch(options).then(async browser => {
//browser new page
  const p = await browser.newPage();
  await p.emulateCPUThrottling(4);
//launch URL
  await p.goto(baseURl + loginPath);
  const time = Date.now();
  const traceFileName = `trace-${time}.json`;
  const recordingFileName = `recording-${time}.webm`;
  console.log('Test started -', time);
  await p.type('#email', 'coolnakul@gmail.com');
  await p.type('#password', 'haliajuhi');
  await p.click('#login-button');
  await p.waitForNavigation();
  const start = performance.now();
  await p.goto(baseURl + canvasPath + '/' + canvasId);
  await p.waitForSelector('#cross-button');
  await p.click('#cross-button');
  await p.waitForSelector('#canvas-fit-to-screen-tool');
  await p.click('#canvas-fit-to-screen-tool');
  await p.waitForSelector('.tl-image');
  // await p.waitForSelector('canvas');
  await p.click('#canvas-fit-to-screen-tool');
  await p.waitForNetworkIdle({
    concurrency: 50,
    idleTime: 500,
    timeout: 3600000,
  });
  const end = performance.now();
  await p.click('#canvas-fit-to-screen-tool');
  await p.tracing.start({path: traceFileName});
  const recorder = await p.screencast({path: recordingFileName, speed: '0.5'});
  console.log('Time taken to load canvas: ', (end - start)/1000, 'seconds');
  console.log('canvas loaded');
  const e = await p.$('.tl-canvas');
  const box = await e.boundingBox();
  const st = [box.x+ 40, box.y + 40];
  const en = [box.x + box.width/2, box.y + box.height/2];
  await performBasicOperations(p, en, st);
  await p.tracing.stop();
  const pageMetrics = await p.metrics();
  const metrics = tracealyzer(traceFileName);
  console.log('Events: ', metrics.profiling.events);
  console.log('Metrics: ', metrics.profiling.categories);
  console.log('Page Metrics: ', pageMetrics);
  console.log('FPS', metrics.rendering.fps)
  await recorder.stop();
  await p.browser().close();
})