const { test, beforeEach, expect} = require("@playwright/test");
const playwright  = require("playwright");
const { loginUser, createPerformanceTestReadingsJSON } = require("./utils/utils");
const {
  studioFeedGenerationFlow,
  testHomePageCharacterGenerationsUI
} = require("./utils/utils");
const { mockSuccessTxtToImgGenerateResponse } = require("./utils/mocks");
require('dotenv').config();
const ErrorCheckTestTitle = 'Check Error Handling for Generate character images from the home page';
beforeEach(async ({ page, context, browserName }, testInfo) => {
  // if(testInfo.title === ErrorCheckTestTitle && browserName === 'webkit')
  //   await mockErrorStudioGenerationFlow(page);
  // await mockWebsocket(page);
  // await handleGenerationRouting(page, context, { data: mockSuccessTxtToImgGenerateResponse, err: {} });
  // await mockWebsocket(page);
  await loginUser(page);
});



test('Success Handling: Generate character images from the home page', async ({ page }) => {
  const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
  //Generation triggered

  await page.getByRole('button', { name: 'Generate Image' }).click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  });

  console.log(readingsJSON);
  const testName = __filename.split('/').pop().split('.')[0]
  createPerformanceTestReadingsJSON(testName , readingsJSON);
});

// test('Error Handling: Check Error Handling for Generate character images from the home page', async ({ page }) => {
//   // const context = browser.newContext();
//   // await context.route('**/*.{png,jpg,jpeg, webp}', route => route.abort());
//   // const page = await context.newPage();
//   // await page.goto(process.env.BASE_URL);
//
//
//   // await page.reload();
//
//   // const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
//   // console.log(webSocketData.ws);
//   await page.waitForTimeout(2000)
//   // webSocketData.ws.send('{"event":"pusher:ping","data":{}}');
//   // webSocketData.ws.send('{"event":"pusher:ping","data":{}}');
//   // webSocketData.ws.send('{"event":"pusher:ping","data":{}}');
//   // webSocketData.server.send('{"event":"pusher:ping","data":{}}');
//   console.log(webSocketData.channel, 'Websocket Channel');
//   webSocketData.ws.send(JSON.stringify({
//     event: 'test_message',
//     channel: webSocketData.channel,
//     data: {
//       test: 'FROM PLAYWRIGHT!!',
//     }
//   }));
//   await page.waitForTimeout(600_000);
//   //Generation triggered
//
//   // await page.getByRole('button', { name: 'Generate Image' }).click();
//   //
//   // const readingsJSON = await studioFeedGenerationErrorFlow(page, async (requestData) => {
//   //   await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
//   // });
//
//   // console.log(readingsJSON);
//   // createPerformanceTestReadingsJSON(`app-home-character-image-gen-error`, readingsJSON);
// });

