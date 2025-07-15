/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// International location files - commented out as they're not used in this implementation
// const INTL_SINGLE_FILES = [
//   'austria_single_location.json', 'belgium_single_location.json', 'colombia_single_location.json', 
//   'cyprus_single_location.json', 'denmark_single_location.json', 'egypt_single_location.json', 
//   'hungary_single_location.json', 'india_single_location.json', 'italy_single_location.json', 
//   'kenya_single_location.json', 'lithuania_single_location.json', 'malta_single_location.json', 
//   'mauritius_single_location.json', 'netherlands_single_location.json', 'oman_single_location.json', 
//   'pakistan_single_location.json', 'slovakia_single_location.json', 'slovenia_single_location.json', 
//   'sweden_single_location.json', 'taiwan_single_location.json', 'thailand_single_location.json', 
//   'united_arab_emirates_single_location.json', 'zambia_single_location.json'
// ];

// const INTL_MULTI_FILES = [
//   'australia_multi_locations.json', 'brazil_multi_locations.json', 'bulgaria_multi_locations.json', 
//   'canada_multi_locations.json', 'caribbean_multi_locations.json', 'china_multi_locations.json', 
//   'croatia_multi_locations.json', 'czech_republic_multi_locations.json', 'france_multi_locations.json', 
//   'greece_multi_locations.json', 'hong_kong_multi_locations.json', 'indonesia_multi_locations.json', 
//   'ireland_multi_locations.json', 'malaysia_multi_locations.json', 'mexico_multi_locations.json', 
//   'nigeria_multi_locations.json', 'philippines_multi_locations.json', 'portugal_multi_locations.json', 
//   'romania_multi_locations.json', 'singapore_multi_locations.json', 'south_africa_multi_locations.json', 
//   'spain_multi_locations.json', 'switzerland_multi_locations.json', 'ukraine_multi_locations.json', 
//   'united_kingdom_multi_locations.json'
// ];

// interface Location {
//   title: string;
//   latitude: string;
//   longitude: string;
//   address: string;
// }

// interface CountryData {
//   country: string;
//   regions: Array<{
//     region: string;
//     locations: Location[];
//   }>;
// }

export async function POST() {
  try {
    // Hardcoded country counts from screenshot
    const countryLocationCounts: { [country: string]: number } = {
      'Australia': 33,
      'Austria': 1,
      'Belgium': 1,
      'Brazil': 4,
      'Bulgaria': 4,
      'Canada': 60,
      'Caribbean': 3,
      'China': 5,
      'Colombia': 1,
      'Croatia': 4,
      'Cyprus': 1,
      'Czech Republic': 2,
      'Denmark': 1,
      'Egypt': 1,
      'France': 2,
      'Greece': 2,
      'Hong Kong': 2,
      'Hungary': 1,
      'India': 1,
      'Indonesia': 3,
      'Ireland': 3,
      'Italy': 1,
      'Kenya': 1,
      'Lithuania': 1,
      'Malaysia': 2,
      'Malta': 1,
      'Mauritius': 1,
      'Mexico': 36,
      'Netherlands': 1,
      'Nigeria': 2,
      'Oman': 1,
      'Pakistan': 1,
      'Philippines': 2,
      'Portugal': 2,
      'Romania': 1,
      'Singapore': 3,
      'Slovakia': 1,
      'Slovenia': 1,
      'South Africa': 2,
      'Spain': 3,
      'Sweden': 1,
      'Switzerland': 4,
      'Taiwan': 1,
      'Thailand': 1,
      'Ukraine': 2,
      'United Arab Emirates': 1,
      'United Kingdom': 10,
      'Zambia': 1,
      'United States': 1800
    };

    // Define colors
    const colors = [
      '#f0f0f0', // 0
      '#e3f0ff', // 1
      '#b3d8ff', // 2-5
      '#7fc7ff', // 6-10
      '#4fa3e3', // 11-25
      '#2176b6', // 26-50
      '#0d3c61', // 51-100
      '#001933', // 101+
    ];
    const binLabels = [
      'No locations',
      '1 location',
      '2–5 locations',
      '6–10 locations',
      '11–25 locations',
      '26–50 locations',
      '51–100 locations',
      '101+ locations',
    ];

    // Load world countries GeoJSON
    const worldCountriesPath = path.join(process.cwd(), 'public', 'world-countries.json');
    const worldCountriesGeoJSON = JSON.parse(fs.readFileSync(worldCountriesPath, 'utf-8'));

    // Create HTML for the heatmap
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>World Locations Heatmap</title>
        <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body { height: 100%; margin: 0; padding: 0; font-family: Arial, sans-serif; }
          body { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
          .map-container { display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
          #map { width: 100vw; height: 100vh; border-radius: 10px; background: #e9ecef; }
          .map-title { position: absolute; top: 20px; left: 20px; background: rgba(255,255,255,0.9); padding: 10px 20px; border-radius: 5px; z-index: 1000; font-size: 18px; font-weight: bold; }
          .location-count { position: absolute; top: 60px; left: 20px; background: rgba(255,255,255,0.9); padding: 10px 20px; border-radius: 5px; z-index: 1000; font-size: 14px; }
          .legend { position: absolute; bottom: 20px; right: 20px; background: rgba(255,255,255,0.9); padding: 15px; border-radius: 5px; z-index: 1000; font-size: 12px; }
          .legend-item { display: flex; align-items: center; margin: 5px 0; }
          .legend-color { width: 20px; height: 20px; margin-right: 10px; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="map-container">
          <div id="map"></div>
        </div>
        <div class="legend">
          <h4>Location Density</h4>
          ${binLabels.map((label, i) => `<div class="legend-item"><div class="legend-color" style="background-color: ${colors[i]};"></div><span>${label}</span></div>`).join('')}
        </div>
        <script>
          const map = L.map('map').setView([60, -20], 1.5);;
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
          const countryCounts = ${JSON.stringify(countryLocationCounts)};
          // Normalize country names for matching
          function normalizeName(name) {
            if (!name) return '';
            let n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Handle common mismatches
            if (n === 'unitedstates') return 'unitedstatesofamerica';
            if (n === 'unitedkingdom') return 'unitedkingdom';
            if (n === 'southkorea') return 'korea';
            if (n === 'northkorea') return 'koreademocraticpeoplesrepublicof';
            if (n === 'russia') return 'russianfederation';
            if (n === 'vietnam') return 'vietnamsocialistrepublicof';
            if (n === 'laos') return 'laopeoplesdemocraticrepublic';
            if (n === 'moldova') return 'moldovarepublicof';
            if (n === 'tanzania') return 'tanzaniatheunitedrepublicof';
            if (n === 'venezuela') return 'venezuelabolivarianrepublicof';
            if (n === 'syria') return 'syrianarabrepublic';
            if (n === 'bolivia') return 'boliviaplurinationalstateof';
            if (n === 'brunei') return 'bruneidarussalam';
            if (n === 'iran') return 'iranislamicrepublicof';
            if (n === 'macao') return 'macao';
            if (n === 'palestine') return 'palestine';
            if (n === 'macedonia') return 'northmacedonia';
            if (n === 'czechrepublic') return 'czechia';
            if (n === 'slovakia') return 'slovakrepublic';
            if (n === 'caribbean') return 'caribbean';
            return n;
          }
          // Map of normalized country names to counts
          const normalizedCounts = {};
          for (const key in countryCounts) {
            normalizedCounts[normalizeName(key)] = countryCounts[key];
          }
          // Color function
          function getColor(count) {
            if (count === 0) return '${colors[0]}';
            if (count === 1) return '${colors[1]}';
            if (count >= 2 && count <= 5) return '${colors[2]}';
            if (count >= 6 && count <= 10) return '${colors[3]}';
            if (count >= 11 && count <= 25) return '${colors[4]}';
            if (count >= 26 && count <= 50) return '${colors[5]}';
            if (count >= 51 && count <= 100) return '${colors[6]}';
            return '${colors[7]}';
          }
          L.geoJSON(${JSON.stringify(worldCountriesGeoJSON)}, {
            style: function(feature) {
              const props = feature.properties;
              const candidates = [props.ADMIN, props.NAME, props.name];
              let match = candidates.find(Boolean) || 'Country';
              const norm = normalizeName(match);
              const count = normalizedCounts[norm] || 0;
              return {
                fillColor: getColor(count),
                weight: 1,
                opacity: 1,
                color: '#666',
                fillOpacity: 0.7
              };
            },
            onEachFeature: function(feature, layer) {
              const props = feature.properties;
              const candidates = [props.ADMIN, props.NAME, props.name];
              let match = candidates.find(Boolean) || 'Country';
              const norm = normalizeName(match);
              const count = normalizedCounts[norm] || 0;
            }
          }).addTo(map);
          setTimeout(() => { window.print(); }, 2000);
        </script>
      </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait for map to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="world-locations-heatmap.pdf"'
      }
    });

  } catch (error) {
    console.error('Error generating world map PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 