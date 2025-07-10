import puppeteer from 'puppeteer';
import { getInternationalPdfHtml, getUsStatePdfHtml } from './pdfTemplates';
import fs from 'fs/promises';
import path from 'path';
import { renderGeoJsonMapImage } from './renderGeoJsonMapImage';

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

        // Add timeout and retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error(`Failed to fetch map image for ${lat},${lon}. Status: ${response.status}`);
                return '';
            }
            
            const imageBuffer = await response.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            return `data:${response.headers.get('content-type')};base64,${imageBase64}`;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.error(`Map image fetch timed out for ${lat},${lon}`);
            } else {
                console.error(`Error fetching map for ${lat},${lon}:`, fetchError);
            }
            return '';
        }
    } catch (error) {
        console.error(`Error processing map for ${lat},${lon}:`, error);
        return '';
    }
}

// Helper function to process locations in batches
async function processLocationsInBatches(
    regions: MapRegion[], 
    processLocation: (location: MapLocation) => Promise<void>,
    batchSize: number = 10
): Promise<void> {
    for (const region of regions) {
        if (region.locations && Array.isArray(region.locations)) {
            // Process locations in batches to avoid overwhelming the system
            for (let i = 0; i < region.locations.length; i += batchSize) {
                const batch = region.locations.slice(i, i + batchSize);
                await Promise.all(batch.map(processLocation));
                
                // Small delay between batches to be respectful to external services
                if (i + batchSize < region.locations.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
    }
}

// This is a generic function to generate PDF from HTML using Puppeteer
export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            timeout: 120000, // 2 minutes for browser launch
        });
        const page = await browser.newPage();
        
        // Set longer timeout for page operations
        page.setDefaultTimeout(300000); // 5 minutes
        page.setDefaultNavigationTimeout(300000); // 5 minutes
        
        // Set content and wait for network activity to settle
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 300000 });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '40px',
                right: '20px',
                bottom: '40px',
                left: '20px',
            },
            timeout: 300000, // 5 minutes for PDF generation
        });
        
        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error('Error in generatePdfFromHtml:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// This function specifically handles generating the PDF for international locations
export async function generateInternationalPdf(countryName: string, options?: { richMap?: boolean, priceIncluded?: boolean }): Promise<Buffer> {
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

    // Add priceIncluded to countryData for the template
    if (options && typeof options.priceIncluded !== 'undefined') {
        countryData.priceIncluded = options.priceIncluded;
    }

    // Enrich the data with Base64 map images before rendering HTML using batch processing
    const useRichMap = options?.richMap !== false;
    if (countryData.regions && Array.isArray(countryData.regions)) {
        await processLocationsInBatches(
            countryData.regions,
            async (location: MapLocation) => {
                const lat = location.latitude ?? '';
                const lon = location.longitude ?? '';
                if (useRichMap) {
                    location.mapImage = await getMapImageAsBase64(lat, lon);
                } else {
                    location.mapImage = await renderGeoJsonMapImage({
                        geojsonPath: path.join(process.cwd(), 'public', 'world-countries.json'),
                        pins: [{ latitude: lat, longitude: lon, label: location.title }],
                        country: countryData.country,
                    });
                }
            },
            5 // Smaller batch size for better performance
        );
    }

    // Generate the HTML using the template
    const html = getInternationalPdfHtml(countryData);

    // Generate PDF from the HTML
    const pdf = await generatePdfFromHtml(html);

    return pdf;
}

export async function generateAllInternationalPdf(options?: { richMap?: boolean, priceIncluded?: boolean }): Promise<Buffer> {
    const publicDir = path.join(process.cwd(), 'public');
    // Load all international country files (single and multi)
    const singleDir = path.join(publicDir, 'internationalLocationsS');
    const multiDir = path.join(publicDir, 'internationalLocationsR');
    const singleFiles = (await fs.readdir(singleDir)).filter(f => f.endsWith('_single_location.json'));
    const multiFiles = (await fs.readdir(multiDir)).filter(f => f.endsWith('_multi_locations.json'));
    const allCountryData: any[] = [];
    // Load single location countries
    for (const file of singleFiles) {
        const fileContent = await fs.readFile(path.join(singleDir, file), 'utf-8');
        const data = JSON.parse(fileContent);
        if (data.state_data) {
            allCountryData.push({
                country: data.state,
                total_locations: data.total_locations,
                scraped_at: data.scraped_at,
                regions: data.state_data.cities.map((city: any) => ({
                    region: city.city_name,
                    locations: city.locations,
                    location_count: city.location_count || (city.locations ? city.locations.length : 0)
                }))
            });
        }
    }
    // Load multi location countries
    for (const file of multiFiles) {
        const fileContent = await fs.readFile(path.join(multiDir, file), 'utf-8');
        const data = JSON.parse(fileContent);
        if (data.country && data.regions) {
            allCountryData.push({
                country: data.country,
                total_locations: data.total_locations,
                scraped_at: data.scraped_at,
                regions: data.regions
            });
        }
    }
    // Enrich all locations with map images using batch processing
    const useRichMap = options?.richMap !== false;
    for (const countryData of allCountryData) {
        if (options && typeof options.priceIncluded !== 'undefined') {
            countryData.priceIncluded = options.priceIncluded;
        }
        if (countryData.regions && Array.isArray(countryData.regions)) {
            await processLocationsInBatches(
                countryData.regions,
                async (location: MapLocation) => {
                    const lat = location.latitude ?? '';
                    const lon = location.longitude ?? '';
                    if (useRichMap) {
                        location.mapImage = await getMapImageAsBase64(lat, lon);
                    } else {
                        location.mapImage = await renderGeoJsonMapImage({
                            geojsonPath: path.join(process.cwd(), 'public', 'world-countries.json'),
                            pins: [{ latitude: lat, longitude: lon, label: location.title }],
                            country: countryData.country,
                        });
                    }
                },
                3 // Even smaller batch size for all international processing
            );
        }
    }
    // Combine all countries into one HTML
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>All International Locations</title>
        <style>body { font-family: 'Inter', sans-serif; }</style>
    </head>
    <body>
        ${allCountryData.map(getInternationalPdfHtml).join('<div style="page-break-after: always;"></div>')}
    </body>
    </html>
    `;
    return await generatePdfFromHtml(html);
}

export async function generateUsStatePdf(stateName: string, options?: { richMap?: boolean, priceIncluded?: boolean }): Promise<Buffer> {
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

    // Add priceIncluded to stateData for the template
    if (options && typeof options.priceIncluded !== 'undefined') {
        stateData.priceIncluded = options.priceIncluded;
    }

    // Enrich with map images using batch processing
    const useRichMap = options?.richMap !== false;
    if (stateData.regions && Array.isArray(stateData.regions)) {
        await processLocationsInBatches(
            stateData.regions,
            async (location: MapLocation) => {
                const lat = location.latitude ?? '';
                const lon = location.longitude ?? '';
                if (useRichMap) {
                    location.mapImage = await getMapImageAsBase64(lat, lon);
                } else {
                    location.mapImage = await renderGeoJsonMapImage({
                        geojsonPath: path.join(process.cwd(), 'public', 'us-states.json'),
                        pins: [{ latitude: lat, longitude: lon, label: location.title }],
                        country: stateData.country,
                    });
                }
            },
            5 // Smaller batch size for better performance
        );
    }

    const html = getUsStatePdfHtml(stateData);
    const pdf = await generatePdfFromHtml(html);

    return pdf;
} 