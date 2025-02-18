const { test, beforeEach, expect} = require("@playwright/test");
const playwright  = require("playwright");
const { loginUser, createPerformanceTestReadingsJSON } = require("./utils/utils");
const { addFPSCounter, runFPSCounter, getFPSCounterData } = require("./utils/utils");
require('dotenv').config();
beforeEach(async ({ page: p }) => {
  await loginUser(p);
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

test('Generate character images from the home page', async ({ page }) => {
  const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
  //Generation triggered

  await page.getByRole('button', { name: 'Generate Image' }).click();
  const startTime = performance.now();
  const requestPromise = page.waitForRequest(/.*\/v1\/media\/studio\/generate/);
  await page.waitForURL(`${process.env.BASE_URL}/app/text-to-image`, {
    waitUntil: "load"
  });
  const request = await requestPromise;
  const response = await page.waitForResponse(/.*\/v1\/media\/studio\/generate/);
  await expect(request).toBeTruthy();
  const requestData = JSON.parse(request.postData());
  await expect(requestData[0]?.prompt?.positive?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
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
        timeout: 600_000,
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
  await expect(page.locator(exportButtonSelector)).toBeAttached();
  const initial = {
    totalDuration: generationCompleteTime - startTime,
    apiDuration: generationApiTime,
    loaderShownUIDuration: generationLoaderShownTime - generationApiTime - startTime,
    generationShownUIDuration: generationCompleteTime - generationApiTime - startTime,
    generationPusherEventDelay: generationCompleteTime - generationLoaderShownTime,
    e2eTestsPassed: true,
    isGenerationComplete,
    ...fpsCounterData,
  };
  const readingsJSON = { initial };
  createPerformanceTestReadingsJSON(`app-home-character-image-gen`, readingsJSON);
});

test('Generate character videos from the home page', async ({ page }) => {
  const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
  //Generation triggered

  await page.getByRole('button', { name: 'Generate Video' }).click();
  const startTime = performance.now();
  const requestPromise = page.waitForRequest(/.*\/v1\/media\/studio\/generate/);
  await page.waitForURL(`${process.env.BASE_URL}/app/text-to-image`, {
    waitUntil: "load"
  });
  const request = await requestPromise;
  const response = await page.waitForResponse(/.*\/v1\/media\/studio\/generate/);
  await expect(request).toBeTruthy();
  const requestData = JSON.parse(request.postData());
  await expect(requestData[0]?.txt2vid?.prompt?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
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
        timeout: 600_000,
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
  const initial = {
    totalDuration: generationCompleteTime - startTime,
    apiDuration: generationApiTime,
    loaderShownUIDuration: generationLoaderShownTime - generationApiTime - startTime,
    generationShownUIDuration: generationCompleteTime - generationApiTime - startTime,
    generationPusherEventDelay: generationCompleteTime - generationLoaderShownTime,
    e2eTestsPassed: true,
    isGenerationComplete,
    ...fpsCounterData,
  };
  const readingsJSON = { initial };
  createPerformanceTestReadingsJSON(`app-home-character-image-gen`, readingsJSON);
});

