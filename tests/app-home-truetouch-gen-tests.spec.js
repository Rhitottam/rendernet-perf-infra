import {test, expect, beforeEach} from '@playwright/test';
import {
  addFPSCounter,
  loginUser,
  runFPSCounter,
  studioFeedGenerationFlow,
  selectImageAssetFromAssetLibrary, createPerformanceTestReadingsJSON
} from "./utils/utils";


beforeEach(async ({ page: p }) => {
  await loginUser(p);
});

test('Generate TrueTouch Images from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#do-more-card-grid-wrapper-truetouch');

  await expect(page.getByRole('button', { name: 'TrueTouch Add lifelike' })).toBeVisible();
  await page.getByRole('button', { name: 'TrueTouch Add lifelike' }).click();
  await page.waitForSelector('#true-touch-modal-body');
  await expect(page.getByLabel('Realism Strength')).toBeVisible();
  await expect(page.getByText('Upscale only')).toBeVisible();
  await page.getByLabel('Upscale only').check();
  await expect(page.getByText('1x')).toBeVisible();
  await page.getByText('1x').click();

  const placeHolderSelector = '#true-touch-image-drag-drop';
  const imageSelector = '#true-touch-image';
  await selectImageAssetFromAssetLibrary(
    page, isMobile, placeHolderSelector, imageSelector
  );

  await expect(page.locator('#delete-true-touch-image-button')).toBeVisible();
  await page.locator('#delete-true-touch-image-button').click();
  await expect(await page.locator('#delete-true-touch-image-button').isVisible()).toBeFalsy();

  await expect(page.getByRole('button', { name: 'Enhance' })).toBeVisible();


  await selectImageAssetFromAssetLibrary(
    page, isMobile, placeHolderSelector, imageSelector
  );

  await expect(page.getByRole('button', { name: 'Enhance' })).toBeEnabled();
  // Generation Triggered
  await page.getByRole('button', { name: 'Enhance' }).click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  createPerformanceTestReadingsJSON(`app-home-truetouch-image-gen`, readingsJSON);
});