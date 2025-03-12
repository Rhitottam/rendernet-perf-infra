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

test('Generate PoseLock Images from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#do-more-card-grid-wrapper-pose-lock');
  await expect(page.getByRole('button', { name: 'Pose Lock Make your character' })).toBeVisible();
  await page.getByRole('button', { name: 'Pose Lock Make your character' }).click();
  await page.waitForSelector('#pose-lock-modal-body');

  await expect(page.locator('#pose-control-generate-button')).toBeDisabled();
  await page.waitForSelector('.character-container-home:nth-child(1)')
  await page.locator('.character-container-home:nth-child(1)').click();
  await page.waitForSelector('.pose-image-container:nth-child(1)');
  await page.locator('.pose-image-container:nth-child(1)').click();
  await expect(page.locator('#pose-control-generate-button')).toBeEnabled();
  await page.locator('#pose-control-generate-button').click();
  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  const testName = __filename.split('/').pop().split('.')[0]
  createPerformanceTestReadingsJSON(testName , readingsJSON);
});