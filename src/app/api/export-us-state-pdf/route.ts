import { NextResponse } from 'next/server';
import { generateUsStatePdf } from '@/lib/puppeteerPdfGenerator';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { state } = body;

        if (!state) {
            return new NextResponse(JSON.stringify({ error: 'State is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Generate the PDF buffer for the selected state
        const pdfBuffer = await generateUsStatePdf(state);

        // Create a filename for the PDF
        const filename = `AnytimeMailbox_${state.replace(/\s+/g, '_')}.pdf`;

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