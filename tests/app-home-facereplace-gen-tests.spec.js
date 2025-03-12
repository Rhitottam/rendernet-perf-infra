import {test, expect, beforeEach} from '@playwright/test';
import {
  addFPSCounter,
  loginUser,
  runFPSCounter,
  studioFeedGenerationFlow,
  selectImageAssetFromAssetLibrary,
  createPerformanceTestReadingsJSON,
  uploadImageAssetIntoAssetLibraryAndSelect
} from "./utils/utils";


beforeEach(async ({ page: p }) => {
  await loginUser(p);
});



test('Generate Face Replace Images from App Home', async ({ page, isMobile }) => {
  await addFPSCounter(page);
  await runFPSCounter(page);
  await page.waitForSelector('#do-more-card-grid-wrapper-face-replace');

  await expect(page.getByRole('button', { name: 'Face Replace Swap faces' })).toBeVisible();
  await page.getByRole('button', { name: 'Face Replace Swap faces' }).click();
  await page.waitForSelector('#face-replace-home-modal-container');
  await expect(page.locator('#detected-faces-container')).toBeVisible();

  const placeHolderSelector = '#face-replace-drag-drop';
  const imageSelector = '#face-replace-photo-cont';
  await uploadImageAssetIntoAssetLibraryAndSelect(
    page, isMobile, placeHolderSelector, imageSelector
  );
  //
  await expect(page.locator('#delete-face-replace-image-button')).toBeVisible();
  await page.locator('#delete-face-replace-image-button').click();
  await expect(await page.locator('#delete-face-replace-image-button').isVisible()).toBeFalsy();
  await expect(page.locator('#face-replace-button')).toBeVisible();
  await expect(page.locator('#face-replace-button')).toBeDisabled();

  await selectImageAssetFromAssetLibrary(
    page, isMobile, placeHolderSelector, imageSelector
  );



  await page.waitForSelector('#detected-face-image');
  await expect(page.locator('#detected-face-image')).toBeVisible();

  const replaceFaceImagePlaceholderSelector = '#uploaded-face-image-placeholder';
  const replaceFaceImageSelector = '#uploaded-face-image';

  await selectImageAssetFromAssetLibrary(
    page, isMobile, replaceFaceImagePlaceholderSelector, replaceFaceImageSelector
  );

  await expect(page.locator('#face-replace-button')).toBeEnabled();

  // Generation Triggered
  await page.locator('#face-replace-button').click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]).not.toBeNull();
  });
  console.log(readingsJSON);
  const testName = __filename.split('/').pop().split('.')[0]
  createPerformanceTestReadingsJSON(testName , readingsJSON);
});