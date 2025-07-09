import puppeteer from 'puppeteer';
import { getInternationalPdfHtml, getUsStatePdfHtml } from './pdfTemplates';
import fs from 'fs/promises';
import path from 'path';

// --- Type definitions for stronger safety ---
interface MapLocation {
    latitude?: string;
    longitude?: string;
    mapImage?: string;
    [key: string]: any; // Allow other properties
}

interface MapRegion {
    locations?: MapLocation[];
    [key: string]: any; // Allow other properties
}

interface CountryData {
    country: string;
    regions?: MapRegion[];
    [key: string]: any; // Allow other properties
}

// Define the missing type for clarity
interface InternationalLocation {
    [key: string]: any; 
}

// Using Sets for efficient lookup. Country names are lowercase.
const singleLocationCountries = new Set([
    'zambia', 'slovakia', 'malta', 'hungary', 'colombia', 'united arab emirates',
    'thailand', 'taiwan', 'sweden', 'slovenia', 'pakistan', 'oman', 'netherlands',
    'mauritius', 'lithuania', 'kenya', 'italy', 'india', 'egypt', 'denmark',
    'cyprus', 'belgium', 'austria'
]);

const multiLocationCountries = new Set([
    'united kingdom', 'ukraine', 'switzerland', 'spain', 'south africa', 'singapore',
    'romania', 'portugal', 'philippines', 'nigeria', 'mexico', 'malaysia',
    'ireland', 'indonesia', 'hong kong', 'greece', 'france', 'czech republic',
    'croatia', 'china', 'caribbean', 'canada', 'bulgaria', 'brazil', 'australia'
]);


async function getMapImageAsBase64(lat: string, lon: string): Promise<string> {
    const width = 800;
    const height = 400;

    try {
        const fLat = parseFloat(lat);
        const fLon = parseFloat(lon);
        if (isNaN(fLat) || isNaN(fLon)) {
            console.error(`Invalid lat/lon provided: ${lat}, ${lon}`);
            return '';
        }

        const zoom = 15; // Zoomed out slightly for better context

        // Switched to a more reliable static map provider
        const url = `https://www.mapito.net/staticmap/?center=${fLat},${fLon}&zoom=${zoom}&size=${width}x${height}&markers=${fLat},${fLon},red-pushpin`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch map image for ${lat},${lon}. Status: ${response.status}`);
            return '';
        }
        const imageBuffer = await response.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        return `data:${response.headers.get('content-type')};base64,${imageBase64}`;
    } catch (error) {
        console.error(`Error fetching map for ${lat},${lon}:`, error);
        return '';
    }
}

// This is a generic function to generate PDF from HTML using Puppeteer
export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        
        // Set content and wait for network activity to settle
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '40px',
                right: '20px',
                bottom: '40px',
                left: '20px',
            },
        });
        
        return Buffer.from(pdfBuffer);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// This function specifically handles generating the PDF for international locations
export async function generateInternationalPdf(countryName: string): Promise<Buffer> {
    const publicDir = path.join(process.cwd(), 'public');
    const countryNameLower = countryName.toLowerCase();
    
    let filePath: string | undefined;

    if (singleLocationCountries.has(countryNameLower)) {
        const countryFileName = countryNameLower.replace(/\s+/g, '_');
        filePath = path.join(publicDir, 'internationalLocationsS', `${countryFileName}_single_location.json`);
    } else if (multiLocationCountries.has(countryNameLower)) {
        const countryFileName = countryNameLower.replace(/\s+/g, '_');
        filePath = path.join(publicDir, 'internationalLocationsR', `${countryFileName}_multi_locations.json`);
    }

    let countryData: CountryData | undefined;

    if (filePath) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            countryData = JSON.parse(fileContent);

            // Normalize single-location country data to match the expected structure
            if (singleLocationCountries.has(countryNameLower) && countryData?.state_data) {
                countryData = {
                    country: countryData.state,
                    total_locations: countryData.total_locations,
                    scraped_at: countryData.scraped_at,
                    regions: countryData.state_data.cities.map((city: any) => ({
                        region: city.city_name,
                        locations: city.locations,
                        location_count: city.location_count || (city.locations ? city.locations.length : 0)
                    }))
                };
            }
        } catch (error) {
            // File not found, will fall through to the main JSON or error out.
        }
    }

    // Fallback to the main JSON file if no specific file was found or read.
    if (!countryData) {
        try {
            const mainJsonPath = path.join(publicDir, 'international_locations.json');
            const jsonData = JSON.parse(await fs.readFile(mainJsonPath, 'utf-8'));
            countryData = (Object.values(jsonData) as CountryData[]).find(
                (c) => c && c.country && c.country.toLowerCase() === countryNameLower
            );
        } catch (error) {
            // If the main file also fails, we will throw the error below.
        }
    }
    
    if (!countryData) {
        throw new Error(`Country data not found for ${countryName}`);
    }

    // Enrich the data with Base64 map images before rendering HTML
    if (countryData.regions && Array.isArray(countryData.regions)) {
        for (const region of countryData.regions) {
            if (region.locations && Array.isArray(region.locations)) {
                await Promise.all(region.locations.map(async (location: MapLocation) => {
                    location.mapImage = await getMapImageAsBase64(location.latitude ?? '', location.longitude ?? '');
                }));
            }
        }
    }

    // Generate the HTML using the template
    const html = getInternationalPdfHtml(countryData);

    // Generate PDF from the HTML
    const pdf = await generatePdfFromHtml(html);

    return pdf;
}

export async function generateUsStatePdf(stateName: string): Promise<Buffer> {
    const publicDir = path.join(process.cwd(), 'public');
    const stateFileName = `us_state_${stateName.toLowerCase().replace(/\s+/g, '_')}.json`;
    const filePath = path.join(publicDir, 'us_states', stateFileName);

    let stateData: any;

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        stateData = JSON.parse(fileContent);

        // Normalize US state data to match the 'country' structure for the template
        if (stateData?.state_data) {
            stateData = {
                country: stateData.state, // Using 'country' key for the template
                total_locations: stateData.total_locations,
                scraped_at: stateData.scraped_at,
                regions: stateData.state_data.cities.map((city: any) => ({
                    region: city.city_name,
                    locations: city.locations,
                    location_count: city.location_count || (city.locations ? city.locations.length : 0),
                })),
            };
        } else {
            throw new Error(`Incompatible JSON structure for ${stateName}`);
        }
    } catch (error) {
        throw new Error(`Data not found for state: ${stateName}`);
    }

    // Enrich with map images
    if (stateData.regions && Array.isArray(stateData.regions)) {
        for (const region of stateData.regions) {
            if (region.locations && Array.isArray(region.locations)) {
                await Promise.all(
                    region.locations.map(async (location: MapLocation) => {
                        location.mapImage = await getMapImageAsBase64(location.latitude ?? '', location.longitude ?? '');
                    })
                );
            }
        }
    }

    const html = getUsStatePdfHtml(stateData);
    const pdf = await generatePdfFromHtml(html);

    return pdf;
} 