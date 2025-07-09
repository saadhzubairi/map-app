import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const US_DIR = path.join(process.cwd(), 'public', 'us_states');
const INTL_SINGLE_DIR = path.join(process.cwd(), 'public', 'InternationalLocationsS');
const INTL_MULTI_DIR = path.join(process.cwd(), 'public', 'InternationalLocationsR');

const US_FILES = [
  'us_state_alabama.json', 'us_state_alaska.json', 'us_state_arizona.json', 'us_state_arkansas.json', 'us_state_california.json', 'us_state_colorado.json', 'us_state_connecticut.json', 'us_state_delaware.json', 'us_state_florida.json', 'us_state_georgia.json', 'us_state_hawaii.json', 'us_state_idaho.json', 'us_state_illinois.json', 'us_state_indiana.json', 'us_state_iowa.json', 'us_state_kansas.json', 'us_state_kentucky.json', 'us_state_louisiana.json', 'us_state_maine.json', 'us_state_maryland.json', 'us_state_massachusetts.json', 'us_state_michigan.json', 'us_state_minnesota.json', 'us_state_mississippi.json', 'us_state_missouri.json', 'us_state_montana.json', 'us_state_nebraska.json', 'us_state_nevada.json', 'us_state_new_hampshire.json', 'us_state_new_jersey.json', 'us_state_new_mexico.json', 'us_state_new_york.json', 'us_state_north_carolina.json', 'us_state_north_dakota.json', 'us_state_ohio.json', 'us_state_oklahoma.json', 'us_state_oregon.json', 'us_state_pennsylvania.json', 'us_state_rhode_island.json', 'us_state_south_carolina.json', 'us_state_south_dakota.json', 'us_state_tennessee.json', 'us_state_texas.json', 'us_state_utah.json', 'us_state_vermont.json', 'us_state_virginia.json', 'us_state_washington.json', 'us_state_west_virginia.json', 'us_state_wisconsin.json', 'us_state_wyoming.json',
];

function checkFileExists(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function validateUSJson(data: any) {
  const errors = [];
  if (!data.state) errors.push('Missing state');
  if (!data.state_data) errors.push('Missing state_data');
  if (!data.state_data.cities || !Array.isArray(data.state_data.cities)) errors.push('Missing or invalid cities array');
  else if (data.state_data.cities.length === 0) errors.push('No cities');
  // Deep check for missing/blank/zero values
  errors.push(...deepCheck(data));
  return errors;
}

// Recursively check for empty, null, undefined, or 0 (for price/currency fields)
function deepCheck(obj: any, path: string[] = []): string[] {
  let errors: string[] = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      errors = errors.concat(deepCheck(item, [...path, `[${idx}]`]));
    });
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const currentPath = [...path, key];
      if (
        value === '' ||
      value === null ||
        value === undefined ||
        (typeof value === 'number' && key.match(/amount|price|currency/i) && value === 0)
      ) {
        errors.push(`Missing or blank value at ${currentPath.join('.')}`);
      } else if (typeof value === 'object') {
        errors = errors.concat(deepCheck(value, currentPath));
      }
    }
  }
  return errors;
}

function validateIntlSingleJson(data: any) {
  const errors = [];
  if (!data.state) errors.push('Missing country (state)');
  if (!data.state_data) errors.push('Missing state_data');
  if (!data.state_data.cities || !Array.isArray(data.state_data.cities)) errors.push('Missing or invalid cities array');
  else if (data.state_data.cities.length === 0) errors.push('No cities');
  // Deep check for missing/blank/zero values
  errors.push(...deepCheck(data));
  return errors;
}

function validateIntlMultiJson(data: any) {
  const errors = [];
  if (!data.country) errors.push('Missing country');
  if (!data.regions || !Array.isArray(data.regions)) errors.push('Missing or invalid regions array');
  else if (data.regions.length === 0) errors.push('No regions');
  // Deep check for missing/blank/zero values
  errors.push(...deepCheck(data));
  return errors;
}

export async function GET(req: NextRequest) {
  const results: any[] = [];

  // US State JSONs (no deep check for now)
  for (const file of US_FILES) {
    const filePath = path.join(US_DIR, file);
    const exists = checkFileExists(filePath);
    let valid = false;
    let errors: string[] = [];
    if (exists) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        errors = validateUSJson(data);
        valid = errors.length === 0;
      } catch (e: any) {
        errors = ['Invalid JSON: ' + e.message];
      }
    } else {
      errors = ['File does not exist'];
    }
    results.push({ file, type: 'US State', exists, valid, errors });
  }

  // International Single Location JSONs
  const intlSingleFiles = fs.readdirSync(INTL_SINGLE_DIR).filter(f => f.endsWith('.json'));
  for (const file of intlSingleFiles) {
    const filePath = path.join(INTL_SINGLE_DIR, file);
    const exists = checkFileExists(filePath);
    let valid = false;
    let errors: string[] = [];
    if (exists) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        errors = validateIntlSingleJson(data);
        valid = errors.length === 0;
      } catch (e: any) {
        errors = ['Invalid JSON: ' + e.message];
      }
    } else {
      errors = ['File does not exist'];
    }
    results.push({ file, type: 'Intl Single', exists, valid, errors });
  }

  // International Multi Location JSONs
  const intlMultiFiles = fs.readdirSync(INTL_MULTI_DIR).filter(f => f.endsWith('.json'));
  for (const file of intlMultiFiles) {
    const filePath = path.join(INTL_MULTI_DIR, file);
    const exists = checkFileExists(filePath);
    let valid = false;
    let errors: string[] = [];
    if (exists) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        errors = validateIntlMultiJson(data);
        valid = errors.length === 0;
      } catch (e: any) {
        errors = ['Invalid JSON: ' + e.message];
      }
    } else {
      errors = ['File does not exist'];
    }
    results.push({ file, type: 'Intl Multi', exists, valid, errors });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
} 