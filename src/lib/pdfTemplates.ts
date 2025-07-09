export function getInternationalPdfHtml(countryData: any): string {
    const { country, regions, total_locations, scraped_at } = countryData;

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
                <div class="mb-4">
                    <p class="text-3xl font-extrabold text-indigo-600">${plan.monthly_price?.amount?.toFixed(2) || 'N/A'} ${plan.monthly_price?.currency}</p>
                    <p class="text-sm text-gray-500">per month</p>
                </div>
                <div class="mt-auto pt-4 border-t border-gray-200">
                    <h5 class="font-bold mb-2 text-gray-700">Plan Details:</h5>
                    <ul class="space-y-2 text-sm text-gray-600">
                        ${Object.entries(plan.detailed_features)
                            .filter(([key]) => key !== 'pricing')
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

    const renderLocation = (location: any) => {
        const safePrice = location.price || { amount: 0, currency: '' };
        const locationCardHtml = `
            <div class="card mb-6">
                <div class="p-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Left Column: Info & Map -->
                        <div>
                            <h3 class="text-3xl font-bold text-gray-900 mb-2">${location.title}</h3>
                            <p class="text-gray-600 mb-4">${location.address}</p>
                            <div class="flex items-center text-lg font-semibold text-gray-700 mb-6">
                                <span class="text-gray-500 mr-2">Starting from:</span>
                                <span class="text-indigo-600">${safePrice.amount?.toFixed(2) || 'N/A'} ${safePrice.currency}/month</span>
                            </div>
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

    const regionsHtml = (regions || []).map((region: any, index: number) => `
        <section class="mb-16 ${index > 0 ? 'page-break-before' : ''}">
            <h2 class="text-4xl font-bold text-gray-800 mb-8 pb-4 border-b-2 border-indigo-500 inline-block">${region.region} (${region.location_count} Locations)</h2>
            ${region.locations.map(renderLocation).join('')}
        </section>
    `).join('');

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
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <header class="text-center mb-12 border-b pb-6 print-header">
                <h1 class="text-5xl font-extrabold text-gray-900">${country}</h1>
                <p class="text-lg text-gray-500 mt-2">Available Mailbox Locations (${total_locations} total)</p>
            </header>
            ${regionsHtml}
            <footer class="text-center mt-16 pt-8 border-t text-gray-500">
                <p>Report generated on: ${new Date(scraped_at).toLocaleString()}</p>
            </footer>
        </div>
    </body>
    </html>
    `;
} 

export function getUsStatePdfHtml(stateData: any): string {
    const { country: stateName, regions, total_locations, scraped_at } = stateData;

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
                <div class="mb-4">
                    <p class="text-3xl font-extrabold text-indigo-600">${plan.monthly_price?.amount?.toFixed(2) || 'N/A'} ${plan.monthly_price?.currency}</p>
                    <p class="text-sm text-gray-500">per month</p>
                </div>
                <div class="mt-auto pt-4 border-t border-gray-200">
                    <h5 class="font-bold mb-2 text-gray-700">Plan Details:</h5>
                    <ul class="space-y-2 text-sm text-gray-600">
                        ${Object.entries(plan.detailed_features)
                            .filter(([key]) => key !== 'pricing')
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

    const renderLocation = (location: any) => {
        const safePrice = location.price || { amount: 0, currency: '' };
        const locationCardHtml = `
            <div class="card mb-6">
                <div class="p-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-3xl font-bold text-gray-900 mb-2">${location.title}</h3>
                            <p class="text-gray-600 mb-4">${location.address}</p>
                            <div class="flex items-center text-lg font-semibold text-gray-700 mb-6">
                                <span class="text-gray-500 mr-2">Starting from:</span>
                                <span class="text-indigo-600">${safePrice.amount?.toFixed(2) || 'N/A'} ${safePrice.currency}/month</span>
                            </div>
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

    const citiesHtml = (regions || []).map((city: any, index: number) => `
        <section class="mb-16 ${index > 0 ? 'page-break-before' : ''}">
            <h2 class="text-4xl font-bold text-gray-800 mb-8 pb-4 border-b-2 border-indigo-500 inline-block">${city.region} (${city.location_count} Locations)</h2>
            ${city.locations.map(renderLocation).join('')}
        </section>
    `).join('');

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
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <header class="text-center mb-12 border-b pb-6 print-header">
                <h1 class="text-5xl font-extrabold text-gray-900">${stateName}</h1>
                <p class="text-lg text-gray-500 mt-2">Available Mailbox Locations (${total_locations} total)</p>
            </header>
            ${citiesHtml}
            <footer class="text-center mt-16 pt-8 border-t text-gray-500">
                <p>Report generated on: ${new Date(scraped_at).toLocaleString()}</p>
            </footer>
        </div>
    </body>
    </html>
    `;
} 