const { test, beforeEach, expect} = require("@playwright/test");
const playwright  = require("playwright");
const { loginUser, createPerformanceTestReadingsJSON } = require("./utils/utils");
const {
  addFPSCounter,
  runFPSCounter,
  getFPSCounterData,
  studioFeedGenerationFlow,
  studioFeedGenerationErrorFlow,
  mockErrorStudioGenerationFlow,
  mockWebsocket,
  webSocketData,
  handleGenerationRouting,
} = require("./utils/utils");
const { mockSuccessTxtToImgGenerateResponse } = require("./utils/mocks");
require('dotenv').config();
const ErrorCheckTestTitle = 'Check Error Handling for Generate character images from the home page';
beforeEach(async ({ page, context, browserName }, testInfo) => {
  // if(testInfo.title === ErrorCheckTestTitle && browserName === 'webkit')
  //   await mockErrorStudioGenerationFlow(page);
  // await mockWebsocket(page);
  await handleGenerationRouting(page, context, { data: mockSuccessTxtToImgGenerateResponse, err: {} });
  await mockWebsocket(page);
  await loginUser(page);
});

const testHomePageCharacterGenerationsUI = async (page) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#character-prompt-generator-section');
  await expect(page.locator('#character-prompt-generator-section')).toBeVisible();
  await expect(page.locator('#right-scroll-button')).toBeVisible();
  await expect(page.locator('#scroll-item-container')).toBeVisible();
  await expect(page.locator('#scroll-item-container > div:nth-child(1)')).toBeVisible();
  await expect(page.locator('#scroll-item-container > div:nth-child(1) > :nth-child(2)')).toBeVisible();
  const character = await page.locator('#scroll-item-container > div:nth-child(1) > :nth-child(2)').innerText();
  await expect(page.locator('#checked-icon-wrapper').getByRole('img')).toBeVisible();

  await expect(page.getByText('PortraitLandscape')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Image' })).toBeVisible();
  await expect(page.getByPlaceholder('What do you imagine your')).toBeVisible();
  let prompt = await page.getByPlaceholder('What do you imagine your').inputValue();
  await expect(prompt).toContain(character);

  await page.locator('#scroll-item-container > div:nth-child(1)').click();
  prompt = await page.getByPlaceholder('What do you imagine your').inputValue();
  await expect(prompt.includes(character)).toBeFalsy();
  await expect(await page.getByRole('button', { name: 'Generate Image' }).isDisabled()).toBeTruthy();
  await page.locator('#scroll-item-container > div:nth-child(1)').click();

  await page.locator('#home-prompts-suggestions-section > :nth-child(2)').click();
  const newPrompt = await page.getByPlaceholder('What do you imagine your').inputValue();
  await expect(newPrompt).not.toEqual(prompt);
  await expect(newPrompt).toContain(character);

  await expect(await page.locator('#aspect-ratio-selection-container')).toBeVisible();
  await expect(page.locator('#tall-aspect-ratio-button-selected')).toBeVisible();
  await expect(await page.locator('#wide-aspect-ratio-button-selected').isVisible()).toBeFalsy();
  await page.locator('#wide-aspect-ratio-button').click();
  await expect(await page.locator('#tall-aspect-ratio-button-selected').isVisible()).toBeFalsy();
  await page.locator('#tall-aspect-ratio-button').click();

  await expect(await page.getByRole('button', { name: 'Generate Image' }).isEnabled()).toBeTruthy();
  return { character, newPrompt };
}

test('Success Handling: Generate character images from the home page', async ({ page }) => {
  const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
  //Generation triggered

  await page.getByRole('button', { name: 'Generate Image' }).click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  });

  console.log(readingsJSON);
  createPerformanceTestReadingsJSON(`app-home-character-image-gen`, readingsJSON);
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


test('Success Handling: Generate character videos from the home page', async ({ page }) => {
  const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
  //Generation triggered

  await page.getByRole('button', { name: 'Generate Video' }).click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]?.txt2vid?.prompt?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  });

  console.log(readingsJSON);
  createPerformanceTestReadingsJSON(`app-home-character-image-gen`, readingsJSON);
});

