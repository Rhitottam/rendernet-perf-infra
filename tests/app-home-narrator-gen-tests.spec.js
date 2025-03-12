import {test, expect, beforeEach} from '@playwright/test';
import {
  addFPSCounter,
  loginUser,
  runFPSCounter,
  studioFeedGenerationFlow,
  selectImageAssetFromAssetLibrary,
  createPerformanceTestReadingsJSON,
  uploadVideoAssetIntoAssetLibraryAndSelect
} from "./utils/utils";


beforeEach(async ({ page: p }) => {
  await loginUser(p);
});

test('Generate Narrator Videos from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#do-more-card-grid-wrapper-truetouch');

  await expect(page.getByRole('button', { name: 'Narrator Make your characters' })).toBeVisible();
  await page.getByRole('button', { name: 'Narrator Make your characters' }).click();

  const narratorModalOpenStart = performance.now();
  await page.waitForSelector('#narrator-creation-body');
  const narratorModalOpenDuration = performance.now() - narratorModalOpenStart;

  await expect(page.locator('#lip-sync-free-sample-video').getByTestId('video')).toBeVisible();
  let isFreeUser = false;
  try {
    await expect(page.locator('#narrator-video-selection-tab')).toBeVisible();
  }
  catch (e) {
    isFreeUser = true;
    await expect(page.locator('#upgrade-subscription-box')).toBeVisible();
  }

  if(!isFreeUser) {
    await expect(page.locator('#lip-sync-video-home-video-drag-drop')).toBeVisible();
    // await page.locator('#lip-sync-video-home-video-drag-drop').click();
    await uploadVideoAssetIntoAssetLibraryAndSelect(page, isMobile, '#lip-sync-video-home-video-drag-drop', '#lip-sync-asset-upload-cont video');
  }
  else {
    await page.locator('#narrator-next-button').click();
  }

  await page.waitForSelector('#lip-sync-voice-selector-cont', {
    timeout: 300,
  });
  await expect(page.locator('#lip-sync-voice-selector-cont')).toBeVisible();
  await page.locator('#lip-sync-voice-selector-cont').click();
  await page.waitForSelector('#voice-selector-popover');
  await expect(page.locator('#voice-selector-popover')).toBeVisible();
  const voiceName = await page.locator('.voice-container:nth-child(1) .voice-name').innerText();
  await page.locator('.voice-container:nth-child(1) ').click();
  await expect(page.locator('#lip-sync-voice-selector-cont')).toContainText(voiceName);
  await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled();
  await page.getByRole('button', { name: 'Generate' }).click();
  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  const testName = __filename.split('/').pop().split('.')[0]
  createPerformanceTestReadingsJSON(testName , readingsJSON);
});