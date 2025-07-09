import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Location {
  title: string;
  price: {
    amount: number;
    currency: string;
  };
  address: string;
  latitude: string;
  longitude: string;
  plan_url: string;
  is_premier: boolean;
  plans: Plan[];
  location_info?: {
    address_title: string;
    address_text: string;
  };
}

interface Plan {
  title: string;
  monthly_price: {
    amount: number;
    currency: string;
  };
  yearly_price: {
    amount: number;
    currency: string;
  };
  features: Record<string, string>;
  detailed_features?: Record<string, any>;
  service_plan_id: string;
}

interface StateData {
  state: string;
  state_data: {
    state_url: string;
    cities: City[];
  };
}

interface City {
  city_name: string;
  locations: Location[];
}

interface InternationalLocation {
  name: string;
  url: string;
  region?: string;
  urls?: Array<{
    name: string;
    url: string;
  }>;
}

export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private margin: number = 20;
  private contentWidth: number;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  private addHeader(title: string, subtitle?: string) {
    // Header background
    this.doc.setFillColor(59, 130, 246); // Blue-600
    this.doc.rect(0, 0, this.pageWidth, 40, 'F');
    
    // Title
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, 25);
    
    if (subtitle) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 35);
    }
    
    this.currentY = 50;
  }

  private addSectionTitle(title: string, color: string = '#1f2937') {
    this.checkPageBreak(15);
    
    this.doc.setTextColor(color);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    
    // Underline
    this.doc.setDrawColor(59, 130, 246);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 2, this.margin + 50, this.currentY + 2);
    
    this.currentY += 10;
  }

  private addLocationCard(location: Location, cityName: string) {
    this.checkPageBreak(80);
    
    // Card background
    this.doc.setFillColor(249, 250, 251); // Gray-50
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 70, 3, 3, 'F');
    
    // Card border
    this.doc.setDrawColor(229, 231, 235); // Gray-200
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 70, 3, 3, 'S');
    
    const cardX = this.margin + 5;
    const cardY = this.currentY + 5;
    
    // Location title
    this.doc.setTextColor(17, 24, 39); // Gray-900
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(location.title, cardX, cardY);
    
    // City name
    this.doc.setTextColor(107, 114, 128); // Gray-500
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(cityName, cardX, cardY + 5);
    
    // Price
    this.doc.setTextColor(34, 197, 94); // Green-500
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${location.price.currency} ${location.price.amount}`, cardX, cardY + 15);
    
    // Address
    this.doc.setTextColor(75, 85, 99); // Gray-600
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const addressLines = this.wrapText(location.address, this.contentWidth - 10, 9);
    addressLines.forEach((line, index) => {
      this.doc.text(line, cardX, cardY + 25 + (index * 4));
    });
    
    // Coordinates
    this.doc.setTextColor(107, 114, 128); // Gray-500
    this.doc.setFontSize(8);
    this.doc.text(`📍 ${location.latitude}, ${location.longitude}`, cardX, cardY + 45);
    
    // Premier badge
    if (location.is_premier) {
      this.doc.setFillColor(245, 158, 11); // Amber-500
      this.doc.roundedRect(cardX + 60, cardY + 40, 20, 6, 2, 2, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('PREMIER', cardX + 70, cardY + 44);
    }
    
    this.currentY += 80;
  }

  private addPlansTable(plans: Plan[]) {
    this.checkPageBreak(50);
    
    this.addSectionTitle('Service Plans', '#1f2937');
    
    const tableData = plans.map(plan => [
      plan.title || 'Standard',
      `${plan.monthly_price.currency} ${plan.monthly_price.amount}`,
      `${plan.yearly_price.currency} ${plan.yearly_price.amount}`,
      Object.keys(plan.features).length + ' features'
    ]);
    
    (this.doc as any).autoTable({
      startY: this.currentY,
      head: [['Plan', 'Monthly', 'Yearly', 'Features']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'center' }
      }
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addFeaturesList(plan: Plan) {
    this.checkPageBreak(30);
    
    this.doc.setTextColor(17, 24, 39);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${plan.title || 'Standard'} Plan Features:`, this.margin, this.currentY);
    
    this.currentY += 5;
    
    Object.entries(plan.features).forEach(([key, value]) => {
      this.checkPageBreak(8);
      
      this.doc.setTextColor(75, 85, 99);
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`• ${key}: ${value}`, this.margin + 5, this.currentY);
      
      this.currentY += 4;
    });
    
    this.currentY += 5;
  }

  private addInternationalLocation(location: InternationalLocation, countryName: string) {
    this.checkPageBreak(40);
    
    // Card background
    this.doc.setFillColor(249, 250, 251);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 30, 3, 3, 'F');
    
    // Card border
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 30, 3, 3, 'S');
    
    const cardX = this.margin + 5;
    const cardY = this.currentY + 5;
    
    // Location name
    this.doc.setTextColor(17, 24, 39);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(location.name, cardX, cardY);
    
    // Country name
    this.doc.setTextColor(107, 114, 128);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(countryName, cardX, cardY + 8);
    
    // URL
    this.doc.setTextColor(59, 130, 246);
    this.doc.setFontSize(8);
    this.doc.text(location.url, cardX, cardY + 18);
    
    this.currentY += 40;
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.doc.internal.pageSize.getHeight() - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = this.doc.getTextWidth(testLine);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  async generateUSStatePDF(stateData: StateData): Promise<Uint8Array> {
    this.addHeader(`Anytime Mailbox - ${stateData.state}`, 'Complete Location Directory');
    
    this.addSectionTitle(`Locations in ${stateData.state}`);
    
    stateData.state_data.cities.forEach(city => {
      city.locations.forEach(location => {
        this.addLocationCard(location, city.city_name);
        
        // Add plans for this location
        if (location.plans && location.plans.length > 0) {
          this.addPlansTable(location.plans);
          
          // Add detailed features for each plan
          location.plans.forEach(plan => {
            this.addFeaturesList(plan);
          });
        }
      });
    });
    
    return this.doc.output('arraybuffer');
  }

  async generateInternationalPDF(countryData: Record<string, InternationalLocation[]>): Promise<Uint8Array> {
    this.addHeader('Anytime Mailbox - International Locations', 'Complete International Directory');
    
    Object.entries(countryData).forEach(([country, locations]) => {
      this.addSectionTitle(country);
      
      locations.forEach(location => {
        this.addInternationalLocation(location, country);
      });
    });
    
    return this.doc.output('arraybuffer');
  }

  async generateAllLocationsPDF(usData: StateData[], internationalData: Record<string, InternationalLocation[]>): Promise<Uint8Array> {
    this.addHeader('Anytime Mailbox - Complete Directory', 'All US and International Locations');
    
    // US States
    this.addSectionTitle('United States Locations');
    usData.forEach(stateData => {
      this.addSectionTitle(stateData.state, '#6b7280');
      
      stateData.state_data.cities.forEach(city => {
        city.locations.forEach(location => {
          this.addLocationCard(location, city.city_name);
        });
      });
    });
    
    // International
    this.addSectionTitle('International Locations');
    Object.entries(internationalData).forEach(([country, locations]) => {
      this.addSectionTitle(country, '#6b7280');
      
      locations.forEach(location => {
        this.addInternationalLocation(location, country);
      });
    });
    
    return this.doc.output('arraybuffer');
  }

  async generateSpecificLocationPDF(location: Location, cityName: string, stateName: string): Promise<Uint8Array> {
    this.addHeader(`Anytime Mailbox - ${location.title}`, `${cityName}, ${stateName}`);
    
    this.addLocationCard(location, cityName);
    
    if (location.plans && location.plans.length > 0) {
      this.addPlansTable(location.plans);
      
      location.plans.forEach(plan => {
        this.addFeaturesList(plan);
      });
    }
    
    return this.doc.output('arraybuffer');
  }
}

export default PDFGenerator; 