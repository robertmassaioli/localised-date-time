const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/moment/moment-timezone/develop/data/unpacked/latest.json';
const outputFile = 'src/timezones.js';

https.get(url, (response) => {
  let data = '';

  response.on('data', (chunk) => {
    data += chunk;
  });

  response.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.zones && Array.isArray(jsonData.zones)) {
        const timeZonesArray = jsonData.zones.map(zone => zone.name);
        const formattedArray = `/*\nTo regenerate this file use the gen-options script from the package.json\n*/\n\nexport const TimeZones = ${JSON.stringify(timeZonesArray, null, 2)};`;

        fs.writeFile(outputFile, formattedArray, (err) => {
          if (err) {
            console.error('Error writing to file:', err);
          } else {
            console.log('Time zones have been written to timezones.js');
          }
        });
      } else {
        console.log("No 'zones' array found in the JSON data.");
      }
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('Error fetching data:', error.message);
});
