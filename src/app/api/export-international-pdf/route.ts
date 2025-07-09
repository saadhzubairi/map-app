import { NextResponse } from 'next/server';
import { generateInternationalPdf } from '@/lib/puppeteerPdfGenerator';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { country } = body;

        if (!country) {
            return new NextResponse(JSON.stringify({ error: 'Country is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Generate the PDF buffer for the selected country
        const pdfBuffer = await generateInternationalPdf(country);

        // Create a filename for the PDF
        const filename = `AnytimeMailbox_${country.replace(/\s+/g, '_')}.pdf`;

        // Return the PDF as a response
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error: any) {
        console.error('PDF Generation Error:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to generate PDF', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 