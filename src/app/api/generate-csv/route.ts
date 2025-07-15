import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Location {
  title: string;
  address: string;
  is_premier?: boolean;
  location_info?: {
    operator_info?: {
      verified?: boolean;
    };
  };
}

interface Region {
  region: string;
  locations: Location[];
}

interface CountryData {
  country: string;
  regions: Region[];
}

interface SingleLocationData {
  state: string;
  state_data: {
    cities: {
      city_name: string;
      locations: Location[];
    }[];
  };
}

export async function GET() {
  try {
    const csvRows: string[] = [];
    const headers = ['country', 'city', 'address', 'premier', 'top_rated', 'verified'];
    csvRows.push(headers.join(','));

    // Process InternationalLocationsR folder (multi-location format)
    const multiLocationPath = path.join(process.cwd(), 'public', 'InternationalLocationsR');
    const multiLocationFiles = fs.readdirSync(multiLocationPath).filter(file => file.endsWith('.json'));

    for (const file of multiLocationFiles) {
      if (file === 'country_s_urls.json') continue; // Skip this file
      
      const filePath = path.join(multiLocationPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data: CountryData = JSON.parse(fileContent);

      for (const region of data.regions) {
        for (const location of region.locations) {
          const country = data.country;
          const city = location.title || region.region;
          const address = location.address || '';
          const premier = location.is_premier ? 'Yes' : 'No';
          const topRated = location.location_info?.operator_info?.verified ? 'Yes' : 'No';
          const verified = location.location_info?.operator_info?.verified ? 'Yes' : 'No';

          const row = [
            `"${country}"`,
            `"${city}"`,
            `"${address}"`,
            `"${premier}"`,
            `"${topRated}"`,
            `"${verified}"`
          ];
          csvRows.push(row.join(','));
        }
      }
    }

    // Process internationalLocationsS folder (single-location format)
    const singleLocationPath = path.join(process.cwd(), 'public', 'internationalLocationsS');
    const singleLocationFiles = fs.readdirSync(singleLocationPath).filter(file => file.endsWith('.json'));

    for (const file of singleLocationFiles) {
      const filePath = path.join(singleLocationPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data: SingleLocationData = JSON.parse(fileContent);

      for (const cityData of data.state_data.cities) {
        for (const location of cityData.locations) {
          const country = data.state;
          const city = location.title || cityData.city_name;
          const address = location.address || '';
          const premier = location.is_premier ? 'Yes' : 'No';
          const topRated = location.location_info?.operator_info?.verified ? 'Yes' : 'No';
          const verified = location.location_info?.operator_info?.verified ? 'Yes' : 'No';

          const row = [
            `"${country}"`,
            `"${city}"`,
            `"${address}"`,
            `"${premier}"`,
            `"${topRated}"`,
            `"${verified}"`
          ];
          csvRows.push(row.join(','));
        }
      }
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="international_locations.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV' },
      { status: 500 }
    );
  }
} 