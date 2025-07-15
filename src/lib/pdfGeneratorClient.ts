/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf';

// Types for US locations
export interface USLocation {
  price: string;
  address: string;
  plan_url: string;
  latitude: string;
  longitude: string;
  badges: string[];
  details: Record<string, any>;
}

export interface USStateData {
  url: string;
  location_count: number;
  cities: Record<string, USLocation>;
}

export interface USStatesData {
  scraped_at: string;
  total_locations: number;
  states: Record<string, USStateData>;
}

// Types for International locations
export interface InternationalPlan {
  title: string;
  monthly_price: any;
  monthly_button_url: string;
  yearly_price: any;
  yearly_button_url: string;
  features: Record<string, string>;
  service_plan_id: string;
  detailed_features: Record<string, any>;
}

export interface InternationalLocationInfo {
  address_title: string;
  address_text: string;
  street_address: string;
  suite_info: string;
  city_state_zip: string;
  country: string;
  features: Array<{ name: string; available: boolean }>;
  shipping_carriers: string[];
  operator_info: { name: string; verified: boolean };
}

export interface InternationalLocation {
  location_url: string;
  location_type: string;
  location_name: string;
  plans: InternationalPlan[];
  location_info: InternationalLocationInfo;
}

export interface InternationalSubLocation {
  name: string;
  url: string;
  count: number;
  details: InternationalLocation;
}

export interface InternationalCountryData {
  country: string;
  url: string;
  type: string;
  expected_count: number;
  actual_count: number;
  data: {
    location_url: string;
    location_type: string;
    sub_locations: InternationalSubLocation[];
  };
}

function downloadPDF(doc: jsPDF, filename: string) {
  // Add page numbers before saving
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }
  doc.save(filename);
}

function checkPageBreak(doc: jsPDF, currentY: number, margin: number, neededSpace: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededSpace > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return currentY;
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Header background
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 25);
  
  // Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, margin, 35);
  
  return 50; // Return starting Y position
}

function addSectionTitle(doc: jsPDF, title: string, currentY: number, margin: number) {
  doc.setTextColor('#1f2937');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, currentY);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY + 2, margin + 50, currentY + 2);
  return currentY + 10;
}

function addLocationCard(doc: jsPDF, location: any, locationName: string, currentY: number, margin: number, pageWidth: number) {
  const contentWidth = pageWidth - margin * 2;
  
  // Card background
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, currentY, contentWidth, 60, 3, 3, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, contentWidth, 60, 3, 3, 'S');
  
  const cardX = margin + 5;
  const cardY = currentY + 5;
  
  // Location name
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(locationName, cardX, cardY);
  
  // Price
  if (location.price) {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(location.price, cardX, cardY + 8);
  }
  
  // Address
  if (location.address) {
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(location.address, cardX, cardY + 18);
  }
  
  // Badges
  if (location.badges && location.badges.length > 0) {
    let badgeX = cardX;
    location.badges.forEach((badge: string) => {
      const badgeWidth = doc.getTextWidth(badge) + 8;
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(badgeX, cardY + 35, badgeWidth, 6, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(badge, badgeX + 4, cardY + 39);
      badgeX += badgeWidth + 5;
    });
  }
  
  return currentY + 70;
}

function addPlansTable(doc: jsPDF, plans: any[], currentY: number, margin: number, pageWidth: number) {
  if (!plans || plans.length === 0) return currentY;
  
  const contentWidth = pageWidth - margin * 2;
  const tableY = currentY;
  
  // Table headers
  doc.setFontSize(11);
  doc.setTextColor(59, 130, 246);
  doc.setFont('helvetica', 'bold');
  doc.text('Plan', margin, tableY);
  doc.text('Features', margin + 60, tableY);
  doc.text('Service ID', margin + 120, tableY);
  
  // Header line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, tableY + 2, margin + contentWidth, tableY + 2);
  
  let rowY = tableY + 8;
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'normal');
  
  plans.forEach(plan => {
    // Check for page break
    rowY = checkPageBreak(doc, rowY, margin, 20);
    
    const planTitle = plan.title || 'Standard';
    const featuresCount = plan.features ? Object.keys(plan.features).length : 0;
    const serviceId = plan.service_plan_id || 'N/A';
    
    doc.text(planTitle, margin, rowY);
    doc.text(`${featuresCount} features`, margin + 60, rowY);
    doc.text(serviceId, margin + 120, rowY);
    
    rowY += 6;
  });
  
  return rowY + 4;
}

function addDetailedFeatures(doc: jsPDF, detailedFeatures: any, currentY: number, margin: number, pageWidth: number) {
  if (!detailedFeatures) return currentY;
  
  const contentWidth = pageWidth - margin * 2;
  let featureY = currentY;
  
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Features:', margin, featureY);
  featureY += 6;
  
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'normal');
  
  Object.entries(detailedFeatures).forEach(([key, value]) => {
    if (key === 'pricing') return; // Skip pricing as it's handled separately
    
    const featureText = `${key}: ${value}`;
    const lines = doc.splitTextToSize(featureText, contentWidth - 10);
    
    featureY = checkPageBreak(doc, featureY, margin, lines.length * 4);
    
    lines.forEach((line: any) => {
      doc.text(line, margin + 5, featureY);
      featureY += 4;
    });
    featureY += 2;
  });
  
  return featureY;
}

// Generate PDF for all US states
export function generateAllUSStatesPDF(usData: USStatesData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = addHeader(doc, 'Anytime Mailbox - All US States', `Complete Directory (${usData.total_locations} locations)`);
  
  currentY = addSectionTitle(doc, 'US States Overview', currentY, margin);
  
  // Summary table
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text('State', margin, currentY);
  doc.text('Locations', margin + 80, currentY);
  doc.text('URL', margin + 120, currentY);
  currentY += 6;
  
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + pageWidth - margin * 2, currentY);
  currentY += 4;
  
  doc.setFont('helvetica', 'normal');
  Object.entries(usData.states).forEach(([stateName, stateData]) => {
    currentY = checkPageBreak(doc, currentY, margin, 8);
    doc.text(stateName, margin, currentY);
    doc.text(stateData.location_count.toString(), margin + 80, currentY);
    doc.text(stateData.url, margin + 120, currentY);
    currentY += 6;
  });
  
  currentY += 10;
  
  // Detailed state information
  Object.entries(usData.states).forEach(([stateName, stateData]) => {
    currentY = checkPageBreak(doc, currentY, margin, 30);
    currentY = addSectionTitle(doc, `${stateName} (${stateData.location_count} locations)`, currentY, margin);
    
    Object.entries(stateData.cities).forEach(([cityName, location]) => {
      currentY = checkPageBreak(doc, currentY, margin, 80);
      currentY = addLocationCard(doc, location, cityName, currentY, margin, pageWidth);
      
      // Add details if available
      if (location.details && Object.keys(location.details).length > 0) {
        currentY = addDetailedFeatures(doc, location.details, currentY, margin, pageWidth);
      }
    });
  });
  
  downloadPDF(doc, 'anytime_mailbox_all_us_states.pdf');
}

// Generate PDF for a specific US state
export function generateUSStatePDF(stateName: string, stateData: USStateData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = addHeader(doc, `Anytime Mailbox - ${stateName}`, `${stateData.location_count} locations`);
  
  currentY = addSectionTitle(doc, `Locations in ${stateName}`, currentY, margin);
  
  Object.entries(stateData.cities).forEach(([cityName, location]) => {
    currentY = checkPageBreak(doc, currentY, margin, 80);
    currentY = addLocationCard(doc, location, cityName, currentY, margin, pageWidth);
    
    // Add details if available
    if (location.details && Object.keys(location.details).length > 0) {
      currentY = addDetailedFeatures(doc, location.details, currentY, margin, pageWidth);
    }
  });
  
  downloadPDF(doc, `anytime_mailbox_${stateName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

// Generate PDF for all international locations
export function generateAllInternationalPDF(internationalData: Record<string, InternationalCountryData>) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = addHeader(doc, 'Anytime Mailbox - All International Locations', 'Complete Directory');
  
  currentY = addSectionTitle(doc, 'International Countries Overview', currentY, margin);
  
  // Summary table
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text('Country', margin, currentY);
  doc.text('Expected', margin + 60, currentY);
  doc.text('Actual', margin + 90, currentY);
  doc.text('URL', margin + 120, currentY);
  currentY += 6;
  
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + pageWidth - margin * 2, currentY);
  currentY += 4;
  
  doc.setFont('helvetica', 'normal');
  Object.entries(internationalData).forEach(([countryName, countryData]) => {
    currentY = checkPageBreak(doc, currentY, margin, 8);
    doc.text(countryName, margin, currentY);
    doc.text(countryData.expected_count.toString(), margin + 60, currentY);
    doc.text(countryData.actual_count.toString(), margin + 90, currentY);
    doc.text(countryData.url, margin + 120, currentY);
    currentY += 6;
  });
  
  currentY += 10;
  
  // Detailed country information
  Object.entries(internationalData).forEach(([countryName, countryData]) => {
    currentY = checkPageBreak(doc, currentY, margin, 30);
    currentY = addSectionTitle(doc, `${countryName} (${countryData.actual_count} locations)`, currentY, margin);
    
    countryData.data.sub_locations.forEach(subLocation => {
      currentY = checkPageBreak(doc, currentY, margin, 100);
      
      // Sub-location header
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.setFont('helvetica', 'bold');
      doc.text(subLocation.name, margin, currentY);
      currentY += 6;
      
      // Location details
      const location = subLocation.details;
      if (location.location_info) {
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text('Address:', margin, currentY);
        currentY += 4;
        
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        doc.text(location.location_info.address_text, margin + 5, currentY);
        currentY += 6;
        
        // Features
        if (location.location_info.features) {
          doc.setFontSize(10);
          doc.setTextColor(17, 24, 39);
          doc.setFont('helvetica', 'bold');
          doc.text('Available Features:', margin, currentY);
          currentY += 4;
          
          doc.setFontSize(8);
          doc.setTextColor(75, 85, 99);
          doc.setFont('helvetica', 'normal');
          location.location_info.features.forEach(feature => {
            const status = feature.available ? '✓' : '✗';
            doc.text(`${status} ${feature.name}`, margin + 5, currentY);
            currentY += 3;
          });
          currentY += 2;
        }
        
        // Shipping carriers
        if (location.location_info.shipping_carriers) {
          doc.setFontSize(10);
          doc.setTextColor(17, 24, 39);
          doc.setFont('helvetica', 'bold');
          doc.text('Shipping Carriers:', margin, currentY);
          currentY += 4;
          
          doc.setFontSize(8);
          doc.setTextColor(75, 85, 99);
          doc.setFont('helvetica', 'normal');
          location.location_info.shipping_carriers.forEach(carrier => {
            doc.text(`• ${carrier}`, margin + 5, currentY);
            currentY += 3;
          });
          currentY += 2;
        }
        
        // Operator info
        if (location.location_info.operator_info) {
          doc.setFontSize(10);
          doc.setTextColor(17, 24, 39);
          doc.setFont('helvetica', 'bold');
          doc.text('Operator:', margin, currentY);
          currentY += 4;
          
          doc.setFontSize(8);
          doc.setTextColor(75, 85, 99);
          doc.setFont('helvetica', 'normal');
          doc.text(`${location.location_info.operator_info.name} ${location.location_info.operator_info.verified ? '(Verified)' : ''}`, margin + 5, currentY);
          currentY += 6;
        }
      }
      
      // Plans
      if (location.plans && location.plans.length > 0) {
        currentY = addPlansTable(doc, location.plans, currentY, margin, pageWidth);
        
        // Detailed features for each plan
        location.plans.forEach(plan => {
          if (plan.detailed_features) {
            currentY = addDetailedFeatures(doc, plan.detailed_features, currentY, margin, pageWidth);
          }
        });
      }
    });
  });
  
  downloadPDF(doc, 'anytime_mailbox_all_international.pdf');
}

// Generate PDF for a specific international country
export function generateInternationalCountryPDF(countryName: string, countryData: InternationalCountryData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = addHeader(doc, `Anytime Mailbox - ${countryName}`, `${countryData.actual_count} locations`);
  
  currentY = addSectionTitle(doc, `Locations in ${countryName}`, currentY, margin);
  
  countryData.data.sub_locations.forEach(subLocation => {
    currentY = checkPageBreak(doc, currentY, margin, 100);
    
    // Sub-location header
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    doc.text(subLocation.name, margin, currentY);
    currentY += 6;
    
    // Location details
    const location = subLocation.details;
    if (location.location_info) {
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text('Address:', margin, currentY);
      currentY += 4;
      
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.setFont('helvetica', 'normal');
      doc.text(location.location_info.address_text, margin + 5, currentY);
      currentY += 6;
      
      // Features
      if (location.location_info.features) {
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text('Available Features:', margin, currentY);
        currentY += 4;
        
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        location.location_info.features.forEach(feature => {
          const status = feature.available ? '✓' : '✗';
          doc.text(`${status} ${feature.name}`, margin + 5, currentY);
          currentY += 3;
        });
        currentY += 2;
      }
      
      // Shipping carriers
      if (location.location_info.shipping_carriers) {
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text('Shipping Carriers:', margin, currentY);
        currentY += 4;
        
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        location.location_info.shipping_carriers.forEach(carrier => {
          doc.text(`• ${carrier}`, margin + 5, currentY);
          currentY += 3;
        });
        currentY += 2;
      }
      
      // Operator info
      if (location.location_info.operator_info) {
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text('Operator:', margin, currentY);
        currentY += 4;
        
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        doc.text(`${location.location_info.operator_info.name} ${location.location_info.operator_info.verified ? '(Verified)' : ''}`, margin + 5, currentY);
        currentY += 6;
      }
    }
    
    // Plans
    if (location.plans && location.plans.length > 0) {
      currentY = addPlansTable(doc, location.plans, currentY, margin, pageWidth);
      
      // Detailed features for each plan
      location.plans.forEach(plan => {
        if (plan.detailed_features) {
          currentY = addDetailedFeatures(doc, plan.detailed_features, currentY, margin, pageWidth);
        }
      });
    }
  });
  
  downloadPDF(doc, `anytime_mailbox_${countryName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
} 