import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// US state JSON files
const STATE_JSONS = [
  'us_state_alabama.json', 'us_state_alaska.json', 'us_state_arizona.json', 'us_state_arkansas.json', 
  'us_state_california.json', 'us_state_colorado.json', 'us_state_connecticut.json', 'us_state_delaware.json', 
  'us_state_florida.json', 'us_state_georgia.json', 'us_state_hawaii.json', 'us_state_idaho.json', 
  'us_state_illinois.json', 'us_state_indiana.json', 'us_state_iowa.json', 'us_state_kansas.json', 
  'us_state_kentucky.json', 'us_state_louisiana.json', 'us_state_maine.json', 'us_state_maryland.json', 
  'us_state_massachusetts.json', 'us_state_michigan.json', 'us_state_minnesota.json', 'us_state_mississippi.json', 
  'us_state_missouri.json', 'us_state_montana.json', 'us_state_nebraska.json', 'us_state_nevada.json', 
  'us_state_new_hampshire.json', 'us_state_new_jersey.json', 'us_state_new_mexico.json', 'us_state_new_york.json', 
  'us_state_north_carolina.json', 'us_state_north_dakota.json', 'us_state_ohio.json', 'us_state_oklahoma.json', 
  'us_state_oregon.json', 'us_state_pennsylvania.json', 'us_state_rhode_island.json', 'us_state_south_carolina.json', 
  'us_state_south_dakota.json', 'us_state_tennessee.json', 'us_state_texas.json', 'us_state_utah.json', 
  'us_state_vermont.json', 'us_state_virginia.json', 'us_state_washington.json', 'us_state_west_virginia.json', 
  'us_state_wisconsin.json', 'us_state_wyoming.json'
];

interface Location {
  title: string;
  latitude: string;
  longitude: string;
  address: string;
}

interface CityData {
  city_name: string;
  locations: Location[];
}

interface StateData {
  state: string;
  state_data: {
    cities: CityData[];
  };
}

export async function POST(request: NextRequest) {
  try {
    // Load all US locations
    const allLocations: Location[] = [];
    
    for (const filename of STATE_JSONS) {
      try {
        const filePath = path.join(process.cwd(), 'public', 'us_states', filename);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const stateData: StateData = JSON.parse(fileContent);
          
          if (stateData.state_data?.cities) {
            for (const city of stateData.state_data.cities) {
              for (const location of city.locations) {
                if (location.latitude && location.longitude) {
                  allLocations.push(location);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error loading ${filename}:`, error);
      }
    }

    // Load US states GeoJSON
    const usStatesPath = path.join(process.cwd(), 'public', 'us-states.json');
    const usStatesGeoJSON = JSON.parse(fs.readFileSync(usStatesPath, 'utf-8'));

    // Create HTML for the map
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>US Locations Map</title>
        <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map {
            width: 827px;
            height: 1169px;
            margin: 0;
            padding: 0;
            border: 0;
            box-sizing: border-box;
          }
          body {
            background: #e5e5e5;
            font-family: Arial, sans-serif;
          }
          #map {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          const map = L.map('map');
          const usBounds = L.latLngBounds([
            [-40.7763, -179.148909], // Southwest (Hawaii)
            [71.5388, -66.885444]   // Northeast (Alaska/continental US)
          ]);
          map.fitBounds(usBounds);
          map.setZoom(map.getZoom() - 0); // Zoom out a bit to show all of US and Alaska
          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          // Add US states GeoJSON
          L.geoJSON(${JSON.stringify(usStatesGeoJSON)}, {
            style: {
              fillColor: '#f0f0f0',
              weight: 1,
              opacity: 1,
              color: '#666',
              fillOpacity: 0.3
            }
          }).addTo(map);
          // Add location pins
          const locations = ${JSON.stringify(allLocations)};
          locations.forEach(location => {
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                  className: 'custom-pin',
                  html: '<div style="background-color: #43a047; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #1b5e20;"></div>',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                })
              }).addTo(map);
              marker.bindTooltip(location.title, {
                permanent: false,
                direction: 'top'
              });
            }
          });
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
    await page.setViewport({ width: 1169 , height: 827 }); // A4 portrait in px
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    const pdf = await page.pdf({
      width: '11.69in', // A4 width
      height: '8.27in', // A4 height
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      pageRanges: '1'
    });
    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="us-locations-map.pdf"'
      }
    });

  } catch (error) {
    console.error('Error generating US map PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 


/* 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

*/