const {test, expect} = require("@playwright/test");
const {
  studioFeedGenerationFlow,
  createPerformanceTestReadingsJSON,
  testHomePageCharacterGenerationsUI,
} = require("./utils/utils");
test('Success Handling: Generate character videos from the home page', async ({ page }) => {
  const { character, newPrompt } = await testHomePageCharacterGenerationsUI(page);
  //Generation triggered

  await page.getByRole('button', { name: 'Generate Video' }).click();

  const readingsJSON = await studioFeedGenerationFlow(page, async (requestData) => {
    await expect(requestData[0]?.txt2vid?.prompt?.replaceAll(/\s+/g, '')).toEqual(newPrompt?.replace(`@${character}`, '^character^').replaceAll(/\s+/g, ''));
  });

  console.log(readingsJSON);
  const testName = __filename.split('/').pop().split('.')[0]
  createPerformanceTestReadingsJSON(testName , readingsJSON);
});