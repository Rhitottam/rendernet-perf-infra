import {test, expect, beforeEach} from '@playwright/test';
import {
  addFPSCounter,
  loginUser,
  runFPSCounter,
  studioFeedMusicVideoGenerationFlow,
  createPerformanceTestReadingsJSON,
} from "./utils/utils";


beforeEach(async ({ page: p }) => {
  await loginUser(p);
});

test('Generate Music Videos from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#try-music-video-container');
  await page.locator('#try-music-video-container').click();

  await page.waitForSelector('#music-video-modal-content-wrapper');

  await expect(page.locator('#music-video-generate-button')).toBeDisabled();
  await page.waitForSelector('.music-template-wrapper:nth-child(1)');
  await expect(page.locator('.music-template-wrapper:nth-child(1)')).toBeVisible();
  await page.locator('.music-template-wrapper:nth-child(1)').click();
  await page.waitForSelector('#upload-music-video-audio-asset', {
    state: 'hidden'
  });
  await page.waitForSelector('#music-video-audio-asset-display', {
    state: 'visible'
  });
  await page.waitForSelector('#character-card-null');
  await page.locator('#character-card-null').click();
  await expect(page.locator('#music-video-generate-button')).toBeEnabled();
  await page.locator('#music-video-generate-button').click();

  const readingsJSON = await studioFeedMusicVideoGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  const testName = __filename.split('/').pop().split('.')[0]
  createPerformanceTestReadingsJSON(testName , readingsJSON);
})