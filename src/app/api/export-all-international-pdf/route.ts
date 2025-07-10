import { NextResponse } from 'next/server';
import { generateAllInternationalPdf } from '@/lib/puppeteerPdfGenerator';

// Increase timeout for large datasets - this one needs more time since it processes all countries
export const maxDuration = 600; // 10 minutes for all international locations

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { richMap = true, priceIncluded = true } = body;

        console.log(`Starting PDF generation for ALL international locations with ${richMap ? 'rich' : 'simple'} map and ${priceIncluded ? 'with' : 'without'} prices`);

        // Generate the PDF buffer for all international locations
        const pdfBuffer = await generateAllInternationalPdf({ richMap, priceIncluded });

        console.log(`PDF generation completed for ALL international locations`);

        // Create a filename for the PDF
        const filename = `AnytimeMailbox_All_International.pdf`;

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
                error: 'PDF generation timed out. This can happen when processing all international locations. Please try again or contact support if the issue persists.',
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