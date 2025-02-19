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

test('Generate Upscale Images from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#do-more-card-grid-wrapper-8k-upscale');
  await expect(page.getByRole('button', { name: '8K Upscale Enhance images to' })).toBeVisible();
  await page.getByRole('button', { name: '8K Upscale Enhance images to' }).click();
  await page.waitForSelector('#upscale-8k-modal-body');
  await expect(page.getByText('2K')).toBeVisible();
  await page.getByText('2K').click();

  const placeHolderSelector = '#upscale-image-drag-drop';
  const imageSelector = '#upscale-image';
  await selectImageAssetFromAssetLibrary(
    page, isMobile, placeHolderSelector, imageSelector
  );

  await expect(page.locator('#delete-upscale-image-button')).toBeVisible();
  await page.locator('#delete-upscale-image-button').click();
  await expect(await page.locator('#delete-upscale-image-button').isVisible()).toBeFalsy();

  await expect(page.getByRole('button', { name: 'Upscale' })).toBeDisabled();


  await selectImageAssetFromAssetLibrary(
    page, isMobile, placeHolderSelector, imageSelector
  );

  await expect(page.getByRole('button', { name: 'Upscale' })).toBeEnabled();
  // Generation Triggered
  await page.getByRole('button', { name: 'Upscale' }).click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  createPerformanceTestReadingsJSON(`app-home-upscale-image-gen`, readingsJSON);
});