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

test('Generate Clothes Swap Images from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#do-more-card-grid-wrapper-clothes-swap');
  await expect(page.locator('#do-more-card-grid-wrapper-clothes-swap')).toBeVisible();
  await page.locator('#do-more-card-grid-wrapper-clothes-swap').click();
  await page.waitForSelector('#cloth-swap-modal-body-container');

  await expect(page.locator('#change-clothing-generate-button')).toBeDisabled();

  await expect(page.locator('#change-cloth-asset-wrapper')).toBeVisible();
  await page.waitForSelector('#garments-templates-cont > div:nth-child(1) img')
  await expect(page.locator('#garments-templates-cont > div:nth-child(1) img')).toBeVisible();
  await page.locator('#garments-templates-cont > div:nth-child(1) img').click();
  await page.waitForSelector('img#clothes-swap-upload-photo-cont');
  await expect(page.locator('#change-cloth-asset-wrapper')).toBeHidden();
  await expect(page.locator('img#clothes-swap-upload-photo-cont')).toBeVisible();

  await expect(page.locator('#form-control-clothing-change-types')).toContainText('One Pieces');

  await expect(page.locator('#target-image-upload-cont')).toBeVisible();
  await page.waitForSelector('#target-image-templates-grid > div:nth-child(1) img')
  await expect(page.locator('#target-image-templates-grid > div:nth-child(1) img')).toBeVisible();
  await page.locator('#target-image-templates-grid > div:nth-child(1) img').click();
  await page.waitForSelector('#target-image-cont img');
  await expect(page.locator('#target-image-upload-cont')).toBeHidden();
  await expect(page.locator('#target-image-cont img')).toBeVisible();

  await expect(page.locator('#change-clothing-generate-button')).toBeEnabled();

  await page.locator('#change-clothing-generate-button').click();
  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  createPerformanceTestReadingsJSON(`app-home-clothes-swap-image-gen`, readingsJSON);
});