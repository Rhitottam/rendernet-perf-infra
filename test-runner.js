const {runTest: runLoadStudioFeed }= require("./load-studio-feed");
const {runTest: runLoadWebsite }= require("./load-website");
const fs = require('node:fs');
const {PredefinedNetworkConditions} = require("puppeteer");
const NetworkConditions = {
  'none': null,
  'fast4g': PredefinedNetworkConditions['Fast 3G'],
  'slow4g': PredefinedNetworkConditions['Slow 3G'],
}
const devices = [
  {
    label: 'PC',
    cpuThrottling: 1,
  },
  {
    label: 'Tablet',
    device: 'iPad Pro landscape',
    cpuThrottling: 2,
  },
  {
    label: 'Slow Laptop',
    cpuThrottling: 4,
  },
  // {
  //   label: 'Slow Tablet',
  //   device: 'Galaxy S5 landscape',
  //   cpuThrottling: 8
  // },
]
const runTest = async () => {
  const commandArguments = process.argv.slice(2);
  const test = devices;
  const results = {};
  const networkConditions = NetworkConditions[commandArguments[1]];
  for (const dev of test) {
    try{
      if (commandArguments[0] === 'studioFeed') {
        results[dev.label] = await runLoadStudioFeed(
          NetworkConditions[commandArguments[1]] ?
          {
            ...dev,
            networkConditions: NetworkConditions[commandArguments[1]]
          } : dev);
      }
      else if (commandArguments[0] === 'website') {
        results[dev.label] = await runLoadWebsite(
          NetworkConditions[commandArguments[1]] ?
            {
              ...dev,
              networkConditions: NetworkConditions[commandArguments[1]]
            } : dev);
      }
    }
    catch (err) {
      console.error(err);
    }

  }
  console.log(results);
  try {
    fs.writeFileSync(commandArguments[0]+'_'
      +(commandArguments[2] ?? '')+'_'
      +(commandArguments[3] ?? '')+'.json',
      JSON.stringify(results), 'utf8');
  } catch (err) {
    console.error(err);
  }
}
runTest();