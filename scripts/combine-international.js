const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function getCountryKey(filename) {
  // Remove _multi_locations.json or _single_location.json
  return filename
    .replace('_multi_locations.json', '')
    .replace('_single_location.json', '')
    .replace('.json', '');
}

function combineInternationalFiles() {
  const dirR = path.join(__dirname, '../public/InternationalLocationsR');
  const dirS = path.join(__dirname, '../public/internationalLocationsS');
  const outputFile = path.join(__dirname, '../public/international_locations.json');

  const combinedData = {};

  [dirR, dirS].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = readJsonFile(filePath);
        if (data) {
          const countryKey = getCountryKey(file);
          if (combinedData[countryKey]) {
            // If already exists, merge arrays or objects as needed
            if (Array.isArray(combinedData[countryKey]) && Array.isArray(data)) {
              combinedData[countryKey] = [...combinedData[countryKey], ...data];
            } else if (typeof combinedData[countryKey] === 'object' && typeof data === 'object') {
              combinedData[countryKey] = { ...combinedData[countryKey], ...data };
            }
          } else {
            combinedData[countryKey] = data;
          }
          console.log(`Added ${countryKey}`);
        }
      }
    });
  });

  fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2));
  console.log(`\nCombined ${Object.keys(combinedData).length} countries into ${outputFile}`);
}

combineInternationalFiles(); 