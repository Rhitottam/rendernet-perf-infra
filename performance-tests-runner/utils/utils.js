const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

function getFileNames(directory=`${__dirname}/../../tests`, fileNameCheck = (file) => file.endsWith('.test.js') || file.endsWith('.spec.js')) {
  try {
    // Read all files in the directory
    const files = fs.readdirSync(directory);

    // Filter for test files (e.g., files ending with .test.js or .spec.js)
    const testFiles = files.filter(file => {
      return fileNameCheck(file);
    });

    return testFiles.map(file => file.split('.')[0]);
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

async function readJsonFiles(directory=`${__dirname}/../../tests/utils/test-readings`,) {
  try {
    // Read all files in the directory
    const files = await fsPromises.readdir(directory);

    // Filter for JSON files
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // Create a map to store results
    const results = {};

    // Read each JSON file
    await Promise.all(jsonFiles.map(async (filename) => {
      try {
        const filePath = path.join(directory, filename);
        const content = await fsPromises.readFile(filePath, 'utf8');
        // Store with filename (without .json) as key
        const key = filename.replace('.json', '');
        results[key] = JSON.parse(content);
      } catch (error) {
        console.error(`Error reading file ${filename}:`, error);
        results[filename] = { error: 'Failed to read file' };
      }
    }));

    return results;
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
}

module.exports = {
  getFileNames,
  readJsonFiles,
}