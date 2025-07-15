/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Utility function to modify pricing information for PDF export
function modifyPricingInfo(data: any): any {
    if (data === null || data === undefined) return data;
    
    if (typeof data === 'string') {
        // Check if the string contains "not available" or similar phrases
        const notAvailablePatterns = [
            /not\s+available/i,
            /n\/a/i,
            /unavailable/i,
            /no\s+price/i,
            /price\s+not\s+available/i,
            /contact\s+for\s+pricing/i,
            /pricing\s+upon\s+request/i
        ];
        
        // If it matches any "not available" pattern, leave as is
        if (notAvailablePatterns.some(pattern => pattern.test(data))) {
            return data;
        }
        
        // If it contains any pricing information (currency symbols, numbers, etc.), replace with "Available"
        const hasPricingInfo = /\b[A-Z]{1,3}\$?\s*\d+\.?\d*\b|\$\d+|\€\d+|\£\d+|\¥\d+|\d+\s*(usd|eur|gbp|jpy|cad|aud)/i.test(data);
        if (hasPricingInfo) {
            return 'Available';
        }
        
        return data;
    }
    
    if (Array.isArray(data)) {
        return data.map(item => modifyPricingInfo(item));
    }
    
    if (typeof data === 'object') {
        const modified: any = {};
        for (const [key, value] of Object.entries(data)) {
            // Handle pricing-related keys specially
            if (key.toLowerCase().includes('price') || 
                key.toLowerCase().includes('cost') || 
                key.toLowerCase().includes('fee') ||
                key.toLowerCase().includes('amount') ||
                key.toLowerCase().includes('currency') ||
                key === 'monthly_button_url' ||
                key === 'yearly_button_url' ||
                key === 'pricing') {
                
                // For pricing objects, check if they contain "not available" patterns
                if (typeof value === 'string') {
                    const notAvailablePatterns = [
                        /not\s+available/i,
                        /n\/a/i,
                        /unavailable/i,
                        /no\s+price/i,
                        /price\s+not\s+available/i,
                        /contact\s+for\s+pricing/i,
                        /pricing\s+upon\s+request/i
                    ];
                    
                    if (notAvailablePatterns.some(pattern => pattern.test(value))) {
                        modified[key] = value; // Leave as is
                    } else if (/\b[A-Z]{1,3}\$?\s*\d+\.?\d*\b|\$\d+|\€\d+|\£\d+|\¥\d+|\d+\s*(usd|eur|gbp|jpy|cad|aud)/i.test(value)) {
                        modified[key] = 'Available';
                    } else {
                        modified[key] = value; // Leave as is if no clear pricing info
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // For pricing objects (like {amount: 10, currency: 'USD'}), replace with "Available"
                    modified[key] = 'Available';
                } else {
                    modified[key] = value;
                }
            } else {
                modified[key] = modifyPricingInfo(value);
            }
        }
        return modified;
    }
    
    return data;
}

export function getInternationalPdfHtml(countryData: any): string {
    const { country, regions, total_locations, scraped_at, priceIncluded = true } = countryData;

    // Modify pricing information if priceIncluded is false
    const cleanedData = priceIncluded ? countryData : {
        ...countryData,
        regions: regions?.map((region: any) => ({
            ...region,
            locations: region.locations?.map((location: any) => ({
                ...location,
                plans: location.plans?.map((plan: any) => modifyPricingInfo(plan))
            }))
        }))
    };

    const { regions: cleanedRegions } = cleanedData;

    const createFeatureIcon = (available: boolean) => {
        if (available) {
            return `<svg class="feature-icon text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        }
        return `<svg class="feature-icon text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    };

    const createMap = (mapImageUri: string) => {
        if (!mapImageUri) {
            return '<div class="map-container flex items-center justify-center bg-gray-100 text-gray-500">Map not available</div>';
        }
        return `<div class="map-container"><img src="${mapImageUri}" alt="Location Map" style="width: 100%; height: 100%; object-fit: cover;" /></div>`;
    };
    
    const renderPlans = (plans: any[]) => {
        if (!plans || plans.length === 0) return '<p class="text-gray-500">No plans available for this location.</p>';
        return plans.map(plan => `
            <div class="plan-card flex flex-col rounded-lg p-6 h-full">
                <h4 class="text-xl font-bold text-gray-800 mb-2">${plan.title}</h4>
                <div class="mt-auto pt-4 border-t border-gray-200">
                    <h5 class="font-bold mb-2 text-gray-700">Plan Details:</h5>
                    <ul class="space-y-2 text-sm text-gray-600">
                        ${Object.entries(plan.detailed_features || {})
                            .map(([key, value]) => `
                                <li class="flex">
                                    <div class="font-semibold w-2/5 flex-shrink-0 pr-2">${key}:</div>
                                    <div class="w-3/5">${String(value).replace(/\\n/g, '<br>')}</div>
                                </li>
                            `).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    };

    const renderLocation = (location: any, regionName: string, locationIndex: number) => {
        const safePrice = location.price || { amount: 0, currency: '' };
        const locationId = `location-${regionName.toLowerCase().replace(/\s+/g, '-')}-${locationIndex}`;
        
        const locationCardHtml = `
            <div class="card mb-6" id="${locationId}">
                <div class="p-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Left Column: Info & Map -->
                        <div>
                            <h3 class="text-3xl font-bold text-gray-900 mb-2">${location.title}</h3>
                            <p class="text-gray-600 mb-4">${location.address}</p>
                            ${createMap(location.mapImage)}
                        </div>
                        <!-- Right Column: Operator Info & Features -->
                        <div class="bg-gray-50 p-6 rounded-lg border">
                            <h4 class="text-xl font-bold text-gray-800 mb-4">Location Details</h4>
                            ${location.location_info ? `
                            <div class="mb-6">
                                <p class="font-semibold text-gray-700">Operator</p>
                                <div class="flex items-center">
                                    <p class="text-gray-600">${location.location_info.operator_info?.name}</p>
                                    ${location.location_info.operator_info?.verified ? `<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Verified</span>` : ''}
                                </div>
                            </div>
                            <div class="mb-6">
                                <p class="font-semibold text-gray-700">Available Services</p>
                                <ul class="mt-2 space-y-2">
                                    ${location.location_info.features?.map((feature: any) => `
                                        <li class="flex items-center text-gray-600">
                                            ${createFeatureIcon(feature.available)}
                                            <span>${feature.name}</span>
                                        </li>
                                    `).join('') || ''}
                                </ul>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-700">Shipping Carriers</p>
                                <p class="text-gray-600">${location.location_info.shipping_carriers?.join(', ') || 'N/A'}</p>
                            </div>
                            ` : '<p class="text-gray-500">No additional details available.</p>'}
                        </div>
                    </div>
                </div>
            </div>`;

        const plansHtml = `
            <div class="mb-12 plans-section">
                <h3 class="text-2xl font-bold text-center text-gray-800 mb-8">Available Plans</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 plans-grid-container">
                    ${renderPlans(location.plans)}
                </div>
            </div>`;

        return locationCardHtml + plansHtml;
    };

    // Generate table of contents
    const generateTableOfContents = () => {
        if (!cleanedRegions || cleanedRegions.length === 0) return '';
        
        const tocItems = cleanedRegions.map((region: any) => {
            const regionId = `region-${region.region.toLowerCase().replace(/\s+/g, '-')}`;
            return `
                <li class="mb-2">
                    <a href="#${regionId}" class="text-blue-600 hover:text-blue-800 underline">
                        ${region.region} (${region.location_count} Locations)
                    </a>
                </li>
            `;
        }).join('');
        
        return `
            <div class="mb-8 p-6 bg-gray-50 rounded-lg border">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">Table of Contents</h2>
                <ul class="space-y-1">
                    ${tocItems}
                </ul>
            </div>
        `;
    };

    const regionsHtml = (cleanedRegions || []).map((region: any, index: number) => {
        const regionId = `region-${region.region.toLowerCase().replace(/\s+/g, '-')}`;
        return `
            <section class="mb-16 ${index > 0 ? 'page-break-before' : ''}" id="${regionId}">
                <h2 class="text-4xl font-bold text-gray-800 mb-8 pb-4 border-b-2 border-indigo-500 inline-block">${region.region} (${region.location_count} Locations)</h2>
                ${region.locations.map((location: any, locationIndex: number) => 
                    renderLocation(location, region.region, locationIndex)
                ).join('')}
            </section>
        `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Anytime Mailbox - ${country} Locations</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background-color: white !important; }
            .page-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .card { background-color: white; border-radius: 0.75rem; border: 1px solid #e5e7eb; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
            .plan-card { border: 1px solid #d1d5db; background-color: white; border-radius: 0.75rem; break-inside: avoid; page-break-inside: avoid; }
            .plans-section { break-inside: avoid; page-break-inside: avoid; }
            .map-container { height: 300px; width: 100%; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e5e7eb; }
            .feature-icon { width: 1.25rem; height: 1.25rem; margin-right: 0.5rem; flex-shrink: 0; }
            .page-break-after { page-break-after: always; }
            .page-number { display: none; }
            
            @media print {
                html, body {
                    width: 210mm;
                    margin: 0;
                    padding: 0;
                    font-size: 10pt;
                }
                .page-container { 
                    padding: 10mm 15mm;
                    margin: 0;
                    width: 100%;
                }
                .print-header {
                    margin-bottom: 2rem !important;
                    padding-bottom: 1rem !important;
                }
                .card { 
                    box-shadow: none; 
                    border: 1px solid #ccc; 
                    margin-bottom: 1rem;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }
                h1 { font-size: 24pt; }
                h2 { font-size: 18pt; margin-bottom: 1rem; }
                h3 { font-size: 14pt; }
                .plan-card { 
                    border: 1px solid #ddd;
                    width: 90% !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }
                .plans-grid-container {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 1.5rem;
                }
                .map-container { 
                    display: block;
                    height: 200px;
                }
                .page-break-before {
                    page-break-before: always;
                }
                .page-break-after {
                    display: block;
                    page-break-after: always;
                }
                .page-number {
                    display: block;
                    position: fixed;
                    bottom: 10mm;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 10pt;
                    color: #888;
                }
                @page {
                    margin: 20mm 15mm 20mm 15mm;
                    @bottom-center {
                        content: counter(page);
                    }
                }
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <header class="text-center mb-12 border-b pb-6 print-header">
                <h1 class="text-5xl font-extrabold text-gray-900">${country}</h1>
                <p class="text-lg text-gray-500 mt-2">Available Mailbox Locations (${total_locations} total)</p>
            </header>
            ${generateTableOfContents()}
            <div class="page-break-after"></div>
            ${regionsHtml}
            <footer class="text-center mt-16 pt-8 border-t text-gray-500">
                <p>Report generated on: ${new Date(scraped_at).toLocaleString()}</p>
            </footer>
            <div class="page-number"></div>
        </div>
    </body>
    </html>
    `;
} 

export function getUsStatePdfHtml(stateData: any): string {
    const { country: stateName, regions, total_locations, scraped_at, priceIncluded = true } = stateData;

    // Modify pricing information if priceIncluded is false
    const cleanedData = priceIncluded ? stateData : {
        ...stateData,
        regions: regions?.map((city: any) => ({
            ...city,
            locations: city.locations?.map((location: any) => ({
                ...location,
                plans: location.plans?.map((plan: any) => modifyPricingInfo(plan))
            }))
        }))
    };

    const { regions: cleanedRegions } = cleanedData;

    const createFeatureIcon = (available: boolean) => {
        if (available) {
            return `<svg class="feature-icon text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        }
        return `<svg class="feature-icon text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    };

    const createMap = (mapImageUri: string) => {
        if (!mapImageUri) {
            return '<div class="map-container flex items-center justify-center bg-gray-100 text-gray-500">Map not available</div>';
        }
        return `<div class="map-container"><img src="${mapImageUri}" alt="Location Map" style="width: 100%; height: 100%; object-fit: cover;" /></div>`;
    };

    const renderPlans = (plans: any[]) => {
        if (!plans || plans.length === 0) return '<p class="text-gray-500">No plans available for this location.</p>';
        return plans.map(plan => `
            <div class="plan-card flex flex-col rounded-lg p-6 h-full">
                <h4 class="text-xl font-bold text-gray-800 mb-2">${plan.title || 'Plan'}</h4>
                <div class="mt-auto pt-4 border-t border-gray-200">
                    <h5 class="font-bold mb-2 text-gray-700">Plan Details:</h5>
                    <ul class="space-y-2 text-sm text-gray-600">
                        ${Object.entries(plan.detailed_features || {})
                            .map(([key, value]) => `
                                <li class="flex">
                                    <div class="font-semibold w-2/5 flex-shrink-0 pr-2">${key}:</div>
                                    <div class="w-3/5">${String(value).replace(/\\n/g, '<br>')}</div>
                                </li>
                            `).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    };

    const renderLocation = (location: any, cityName: string, locationIndex: number) => {
        const safePrice = location.price || { amount: 0, currency: '' };
        const locationId = `location-${cityName.toLowerCase().replace(/\s+/g, '-')}-${locationIndex}`;
        
        const locationCardHtml = `
            <div class="card mb-6" id="${locationId}">
                <div class="p-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-3xl font-bold text-gray-900 mb-2">${location.title}</h3>
                            <p class="text-gray-600 mb-4">${location.address}</p>
                            ${createMap(location.mapImage)}
                        </div>
                        <div class="bg-gray-50 p-6 rounded-lg border">
                            <h4 class="text-xl font-bold text-gray-800 mb-4">Location Details</h4>
                            ${location.location_info ? `
                            <div class="mb-6">
                                <p class="font-semibold text-gray-700">Operator</p>
                                <div class="flex items-center">
                                    <p class="text-gray-600">${location.location_info.operator_info?.name}</p>
                                    ${location.location_info.operator_info?.verified ? `<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Verified</span>` : ''}
                                </div>
                            </div>
                            <div class="mb-6">
                                <p class="font-semibold text-gray-700">Available Services</p>
                                <ul class="mt-2 space-y-2">
                                    ${location.location_info.features?.map((feature: any) => `
                                        <li class="flex items-center text-gray-600">
                                            ${createFeatureIcon(feature.available)}
                                            <span>${feature.name}</span>
                                        </li>
                                    `).join('') || ''}
                                </ul>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-700">Shipping Carriers</p>
                                <p class="text-gray-600">${location.location_info.shipping_carriers?.join(', ') || 'N/A'}</p>
                            </div>
                            ` : '<p class="text-gray-500">No additional details available.</p>'}
                        </div>
                    </div>
                </div>
            </div>`;

        const plansHtml = `
            <div class="mb-12 plans-section">
                <h3 class="text-2xl font-bold text-center text-gray-800 mb-8">Available Plans</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 plans-grid-container">
                    ${renderPlans(location.plans)}
                </div>
            </div>`;

        return locationCardHtml + plansHtml;
    };

    // Generate table of contents
    const generateTableOfContents = () => {
        if (!cleanedRegions || cleanedRegions.length === 0) return '';
        
        const tocItems = cleanedRegions.map((city: any) => {
            const cityId = `city-${city.region.toLowerCase().replace(/\s+/g, '-')}`;
            return `
                <li class="mb-2">
                    <a href="#${cityId}" class="text-blue-600 hover:text-blue-800 underline">
                        ${city.region} (${city.location_count} Locations)
                    </a>
                </li>
            `;
        }).join('');
        
        return `
            <div class="mb-8 p-6 bg-gray-50 rounded-lg border">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">Table of Contents</h2>
                <ul class="space-y-1">
                    ${tocItems}
                </ul>
            </div>
        `;
    };

    const citiesHtml = (cleanedRegions || []).map((city: any, index: number) => {
        const cityId = `city-${city.region.toLowerCase().replace(/\s+/g, '-')}`;
        return `
            <section class="mb-16 ${index > 0 ? 'page-break-before' : ''}" id="${cityId}">
                <h2 class="text-4xl font-bold text-gray-800 mb-8 pb-4 border-b-2 border-indigo-500 inline-block">${city.region} (${city.location_count} Locations)</h2>
                ${city.locations.map((location: any, locationIndex: number) => 
                    renderLocation(location, city.region, locationIndex)
                ).join('')}
            </section>
        `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Anytime Mailbox - ${stateName} Locations</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background-color: white !important; }
            .page-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .card { background-color: white; border-radius: 0.75rem; border: 1px solid #e5e7eb; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
            .plan-card { border: 1px solid #d1d5db; background-color: white; border-radius: 0.75rem; break-inside: avoid; page-break-inside: avoid; }
            .plans-section { break-inside: avoid; page-break-inside: avoid; }
            .map-container { height: 300px; width: 100%; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e5e7eb; }
            .feature-icon { width: 1.25rem; height: 1.25rem; margin-right: 0.5rem; flex-shrink: 0; }
            .page-break-after { page-break-after: always; }
            .page-number { display: none; }
            
            @media print {
                html, body {
                    width: 210mm;
                    margin: 0;
                    padding: 0;
                    font-size: 10pt;
                }
                .page-container { 
                    padding: 10mm 15mm;
                    margin: 0;
                    width: 100%;
                }
                .print-header {
                    margin-bottom: 2rem !important;
                    padding-bottom: 1rem !important;
                }
                .card { 
                    box-shadow: none; 
                    border: 1px solid #ccc; 
                    margin-bottom: 1rem;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }
                h1 { font-size: 24pt; }
                h2 { font-size: 18pt; margin-bottom: 1rem; }
                h3 { font-size: 14pt; }
                .plan-card { 
                    border: 1px solid #ddd;
                    width: 90% !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }
                .plans-grid-container {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 1.5rem;
                }
                .map-container { 
                    display: block;
                    height: 200px;
                }
                .page-break-before {
                    page-break-before: always;
                }
                .page-break-after {
                    display: block;
                    page-break-after: always;
                }
                .page-number {
                    display: block;
                    position: fixed;
                    bottom: 10mm;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 10pt;
                    color: #888;
                }
                @page {
                    margin: 20mm 15mm 20mm 15mm;
                    @bottom-center {
                        content: counter(page);
                    }
                }
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <header class="text-center mb-12 border-b pb-6 print-header">
                <h1 class="text-5xl font-extrabold text-gray-900">${stateName}</h1>
                <p class="text-lg text-gray-500 mt-2">Available Mailbox Locations (${total_locations} total)</p>
            </header>
            ${generateTableOfContents()}
            <div class="page-break-after"></div>
            ${citiesHtml}
            <footer class="text-center mt-16 pt-8 border-t text-gray-500">
                <p>Report generated on: ${new Date(scraped_at).toLocaleString()}</p>
            </footer>
            <div class="page-number"></div>
        </div>
    </body>
    </html>
    `;
} 