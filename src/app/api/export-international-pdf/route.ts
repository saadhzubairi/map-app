import { NextResponse } from 'next/server';
import { generateInternationalPdf } from '@/lib/puppeteerPdfGenerator';

// Increase timeout for large datasets
export const maxDuration = 300; // 5 minutes instead of default 30 seconds

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { country, richMap = true, priceIncluded = true } = body;

        if (!country) {
            return new NextResponse(JSON.stringify({ error: 'Country is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`Starting PDF generation for ${country} with ${richMap ? 'rich' : 'simple'} map and ${priceIncluded ? 'with' : 'without'} prices`);

        // Generate the PDF buffer for the selected country
        const pdfBuffer = await generateInternationalPdf(country, { richMap, priceIncluded });

        console.log(`PDF generation completed for ${country}`);

        // Create a filename for the PDF
        const filename = `AnytimeMailbox_${country.replace(/\s+/g, '_')}.pdf`;

        // Return the PDF as a response
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });

    } catch (error: unknown) {
        console.error('PDF Generation Error:', error);
        const message = typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'Unknown error';
        
        // Check if it's a timeout error
        if (message.includes('timeout') || message.includes('Timed out')) {
            return new NextResponse(JSON.stringify({ 
                error: 'PDF generation timed out. This can happen for countries with many locations. Please try again or contact support if the issue persists.',
                details: message 
            }), {
                status: 408, // Request Timeout
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new NextResponse(JSON.stringify({ error: 'Failed to generate PDF', details: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 