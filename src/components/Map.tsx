'use client';

import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { OSM } from 'ol/source';
import { Style, Icon } from 'ol/style';
import { Select } from 'ol/interaction';
import { click } from 'ol/events/condition';
import { boundingExtent } from 'ol/extent';

interface Location {
  price: string;
  address: string;
  plan_url: string;
  latitude: string;
  longitude: string;
  badges: string[];
  details: Record<string, any>;
}

interface CityData {
  [cityName: string]: Location;
}

interface StateData {
  url: string;
  location_count: number;
  cities: CityData;
}

interface MapData {
  scraped_at: string;
  total_locations: number;
  states: {
    [stateName: string]: StateData;
  };
}

interface MapProps {
  className?: string;
}

export default function MapComponent({ className = '' }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Array<{ feature: Feature; location: Location; cityName: string; stateName: string }>>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [showAllStates, setShowAllStates] = useState(true);

  useEffect(() => {
    // Load location data
    const loadLocations = async () => {
      try {
        const response = await fetch('/anytime_mailbox_locations.json');
        const data: MapData = await response.json();
        
        const allLocations: Array<{ feature: Feature; location: Location; cityName: string; stateName: string }> = [];
        const stateNames: string[] = [];
        
        Object.entries(data.states).forEach(([stateName, stateData]) => {
          stateNames.push(stateName);
          Object.entries(stateData.cities).forEach(([cityName, location]) => {
            if (location.latitude && location.longitude) {
              const feature = new Feature({
                geometry: new Point(fromLonLat([parseFloat(location.longitude), parseFloat(location.latitude)])),
                name: cityName,
                state: stateName,
                location: location
              });
              
              // Create a simple pin style
              feature.setStyle(new Style({
                image: new Icon({
                  anchor: [0.5, 1],
                  src: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
                      <circle cx="12" cy="9" r="2.5" fill="white"/>
                    </svg>
                  `)
                })
              }));
              
              allLocations.push({ feature, location, cityName, stateName });
            }
          });
        });
        
        setLocations(allLocations);
        setStates(stateNames.sort());
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create vector source for markers
    const vectorSource = new VectorSource();
    locations.forEach(({ feature }) => {
      vectorSource.addFeature(feature);
    });

    // Create vector layer
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });

    // Create map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([-98.5795, 39.8283]), // Center of USA
        zoom: 4
      })
    });

    // Add click interaction
    const select = new Select({
      condition: click,
      style: null // Use default style for selected features
    });

    select.on('select', (event) => {
      const feature = event.selected[0];
      if (feature) {
        const location = feature.get('location');
        setSelectedLocation(location);
      } else {
        setSelectedLocation(null);
      }
    });

    map.addInteraction(select);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [locations]);

  // Function to focus on a specific state using OpenLayers fit
  const focusOnState = (stateName: string | null) => {
    if (!mapInstanceRef.current) return;

    if (!stateName) {
      // Show all states - reset to USA view
      mapInstanceRef.current.getView().animate({
        center: fromLonLat([-98.5795, 39.8283]),
        zoom: 4,
        duration: 1000
      });
      setSelectedState(null);
      setShowAllStates(true);
      return;
    }

    // Filter locations for the selected state
    const stateLocations = locations.filter(loc => loc.stateName === stateName);
    if (stateLocations.length === 0) return;

    // Get all coordinates in [lon, lat] format
    const coordinates = stateLocations.map(loc => {
      const geometry = loc.feature.getGeometry();
      return geometry instanceof Point ? toLonLat(geometry.getCoordinates()) : null;
    }).filter(Boolean) as [number, number][];

    if (coordinates.length === 1) {
      // Only one location: center and zoom in
      mapInstanceRef.current.getView().animate({
        center: fromLonLat(coordinates[0]),
        zoom: 10,
        duration: 1000
      });
    } else if (coordinates.length > 1) {
      // Fit the map to the bounding extent of all points
      const extent = boundingExtent(coordinates.map(coord => fromLonLat(coord)));
      mapInstanceRef.current.getView().fit(extent, {
        duration: 1000,
        maxZoom: 10,
        padding: [40, 40, 40, 40]
      });
    }

    setSelectedState(stateName);
    setShowAllStates(false);
  };

  // Function to get state abbreviation
  const getStateAbbreviation = (stateName: string): string => {
    const stateAbbreviations: { [key: string]: string } = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
      'Puerto Rico': 'PR'
    };
    return stateAbbreviations[stateName] || stateName;
  };

  return (
    <div className={className}>
      <div 
        ref={mapRef} 
        className="w-full h-[600px] rounded-lg shadow-lg relative"
      />
      
      {/* Location Card */}
      {selectedLocation && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm border border-gray-200 z-10">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 text-sm">
              {selectedLocation.address.split(',')[0]}
            </h3>
            <button 
              onClick={() => setSelectedLocation(null)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          </div>
          
          <p className="text-gray-600 text-xs mb-2">
            {selectedLocation.address}
          </p>
          
          <p className="text-blue-600 font-medium text-sm mb-3">
            {selectedLocation.price}
          </p>
          
          {selectedLocation.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedLocation.badges.map((badge, index) => (
                <span 
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
          
          <a 
            href={selectedLocation.plan_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            View Details
          </a>
        </div>
      )}

      {/* State Selection Control Panel - now below the map */}
      <div className="w-full flex flex-col items-center mt-6">
        <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              {selectedState ? `Showing: ${selectedState}` : 'All States'}
            </h3>
            <button
              onClick={() => focusOnState(null)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                showAllStates 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Show All
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto justify-center">
            {states.map((stateName) => (
              <button
                key={stateName}
                onClick={() => focusOnState(stateName)}
                className={`text-xs px-3 py-2 rounded-full transition-colors border ${
                  selectedState === stateName
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {getStateAbbreviation(stateName)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 