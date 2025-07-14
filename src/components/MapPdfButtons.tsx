'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { MapPin, Globe, FileText } from 'lucide-react';

interface MapPdfButtonsProps {
  className?: string;
}

export default function MapPdfButtons({ className = '' }: MapPdfButtonsProps) {
  const [isGeneratingUsMap, setIsGeneratingUsMap] = useState(false);
  const [isGeneratingWorldMap, setIsGeneratingWorldMap] = useState(false);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);

  const generateUsMapPdf = async () => {
    setIsGeneratingUsMap(true);
    try {
      const response = await fetch('/api/generate-us-map-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate US map PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'us-locations-map.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating US map PDF:', error);
      alert('Failed to generate US map PDF. Please try again.');
    } finally {
      setIsGeneratingUsMap(false);
    }
  };

  const generateWorldMapPdf = async () => {
    setIsGeneratingWorldMap(true);
    try {
      const response = await fetch('/api/generate-world-map-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate world map PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'world-locations-heatmap.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating world map PDF:', error);
      alert('Failed to generate world map PDF. Please try again.');
    } finally {
      setIsGeneratingWorldMap(false);
    }
  };

  const generateCsv = async () => {
    setIsGeneratingCsv(true);
    try {
      const response = await fetch('/api/generate-csv', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to generate CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'international_locations.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Failed to generate CSV. Please try again.');
    } finally {
      setIsGeneratingCsv(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={generateUsMapPdf}
        disabled={isGeneratingUsMap}
        className="flex items-center gap-2"
        variant="outline"
      >
        <MapPin className="w-4 h-4" />
        {isGeneratingUsMap ? 'Generating...' : 'US Map PDF'}
      </Button>
      
      <Button
        onClick={generateWorldMapPdf}
        disabled={isGeneratingWorldMap}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Globe className="w-4 h-4" />
        {isGeneratingWorldMap ? 'Generating...' : 'World Heatmap PDF'}
      </Button>

      <Button
        onClick={generateCsv}
        disabled={isGeneratingCsv}
        className="flex items-center gap-2"
        variant="outline"
      >
        <FileText className="w-4 h-4" />
        {isGeneratingCsv ? 'Generating...' : 'Export CSV'}
      </Button>
    </div>
  );
} 