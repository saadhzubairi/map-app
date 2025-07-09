import { NextRequest, NextResponse } from 'next/server';
import PDFGenerator from '@/lib/pdfGenerator';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, selected, allLocations, exportType } = body;
    
    const pdfGenerator = new PDFGenerator();
    let pdfBuffer: Uint8Array;
    let filename: string;
    
    if (exportType === 'all') {
      // Load all US states
      const usStatesDir = path.join(process.cwd(), 'public', 'us_states');
      const usStateFiles = await fs.readdir(usStatesDir);
      const usData = [];
      
      for (const file of usStateFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(usStatesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          usData.push(JSON.parse(content));
        }
      }
      
      // Load all international data
      const intlDir = path.join(process.cwd(), 'public', 'InternationalLocationsR');
      const intlFiles = await fs.readdir(intlDir);
      const internationalData: Record<string, any[]> = {};
      
      for (const file of intlFiles) {
        if (file.endsWith('.json') && file !== 'country_s_urls.json') {
          const filePath = path.join(intlDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const countryName = file.replace('international_', '').replace('.json', '');
          internationalData[countryName] = JSON.parse(content);
        }
      }
      
      pdfBuffer = await pdfGenerator.generateAllLocationsPDF(usData, internationalData);
      filename = 'anytime_mailbox_complete_directory.pdf';
      
    } else if (exportType === 'modeAll') {
      if (mode === 'us') {
        // Load all US states
        const usStatesDir = path.join(process.cwd(), 'public', 'us_states');
        const usStateFiles = await fs.readdir(usStatesDir);
        const usData = [];
        
        for (const file of usStateFiles) {
          if (file.endsWith('.json')) {
            const filePath = path.join(usStatesDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            usData.push(JSON.parse(content));
          }
        }
        
        // For now, just use the first state as template - you might want to create a combined US PDF
        pdfBuffer = await pdfGenerator.generateUSStatePDF(usData[0]);
        filename = 'anytime_mailbox_us_locations.pdf';
        
      } else {
        // Load all international data
        const intlDir = path.join(process.cwd(), 'public', 'InternationalLocationsR');
        const intlFiles = await fs.readdir(intlDir);
        const internationalData: Record<string, any[]> = {};
        
        for (const file of intlFiles) {
          if (file.endsWith('.json') && file !== 'country_s_urls.json') {
            const filePath = path.join(intlDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const countryName = file.replace('international_', '').replace('.json', '');
            internationalData[countryName] = JSON.parse(content);
          }
        }
        
        pdfBuffer = await pdfGenerator.generateInternationalPDF(internationalData);
        filename = 'anytime_mailbox_international_locations.pdf';
      }
      
    } else if (selected) {
      if (mode === 'us') {
        // Load specific US state
        const stateFile = path.join(process.cwd(), 'public', 'us_states', `us_state_${selected.toLowerCase()}.json`);
        const content = await fs.readFile(stateFile, 'utf-8');
        const stateData = JSON.parse(content);
        
        pdfBuffer = await pdfGenerator.generateUSStatePDF(stateData);
        filename = `anytime_mailbox_${selected.toLowerCase()}.pdf`;
        
      } else {
        // Load specific international country
        const countryFile = path.join(process.cwd(), 'public', 'InternationalLocationsR', `international_${selected.toLowerCase().replace(' ', '_')}.json`);
        const content = await fs.readFile(countryFile, 'utf-8');
        const countryData = { [selected]: JSON.parse(content) };
        
        pdfBuffer = await pdfGenerator.generateInternationalPDF(countryData);
        filename = `anytime_mailbox_${selected.toLowerCase().replace(' ', '_')}.pdf`;
      }
      
    } else {
      return NextResponse.json({ error: 'No selection made' }, { status: 400 });
    }
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (e: any) {
    console.error('PDF generation error:', e);
    return NextResponse.json({ error: 'Failed to generate PDF', details: e?.message || String(e), stack: e?.stack }, { status: 500 });
  }
} 