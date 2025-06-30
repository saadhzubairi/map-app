/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Icon, Stroke, Fill, Text } from 'ol/style';
import { Select } from 'ol/interaction';
import { click } from 'ol/events/condition';
import GeoJSON from 'ol/format/GeoJSON';
import { boundingExtent } from 'ol/extent';
import Overlay from 'ol/Overlay';

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

// --- MAP STYLE CONFIGURATION ---
const MAP_STYLE = {
  // Map background color
  backgroundColor: '#f8fafc', // Tailwind slate-50

  // State border
  stateBorderColor: '#666',
  stateBorderWidth: 0.5,

  // State fill
  stateFillColor: '#ffefd6', // almost transparent

  // State label
  stateLabelColor: '#222',
  stateLabelFont: 'bold 14px sans-serif',
  stateLabelStrokeColor: '#fff',
  stateLabelStrokeWidth: 1,

  // Pin icon SVG color (main fill)
  pinColor: '#fa851e', // Tailwind blue-500
  pinBorderColor: '#823f05', // Tailwind blue-900
};

export default function MapComponent({ className = '' }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Array<{ feature: Feature; location: Location; cityName: string; stateName: string }>>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [showAllStates, setShowAllStates] = useState(true);
  const [stateVectorSource, setStateVectorSource] = useState<VectorSource | null>(null);
  const [tooltipLocation, setTooltipLocation] = useState<{ x: number; y: number } | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  const [filteredPins, setFilteredPins] = useState<typeof locations>([]);
  const [mapLocked, setMapLocked] = useState(false);
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pinLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [address: string]: HTMLDivElement | null }>({});
  const [mapView, setMapView] = useState<View | null>(null);
  const [stateExtent, setStateExtent] = useState<number[] | null>(null);

  // Load US states GeoJSON and set up the vector source
  useEffect(() => {
    const source = new VectorSource();
    fetch('/us-states.json')
      .then(res => res.json())
      .then(data => {
        const features = new GeoJSON().readFeatures(data, {
          featureProjection: 'EPSG:3857',
        });
        source.addFeatures(features);
        setStateVectorSource(source);
        // Set state names for control panel
        setStates(features.map(f => f.get('NAME')).sort());
      });
  }, []);

  // Load mailbox locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch('/anytime_mailbox_locations.json');
        const data: MapData = await response.json();
        const allLocations: Array<{ feature: Feature; location: Location; cityName: string; stateName: string }> = [];
        Object.entries(data.states).forEach(([stateName, stateData]) => {
          Object.entries(stateData.cities).forEach(([cityName, location]) => {
            if (location.latitude && location.longitude) {
              const feature = new Feature({
                geometry: new Point(fromLonLat([parseFloat(location.longitude), parseFloat(location.latitude)])),
                name: cityName,
                state: stateName,
                location: location
              });
              feature.setStyle(new Style({
                image: new Icon({
                  anchor: [0.5, 1],
                  src: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${MAP_STYLE.pinColor}" stroke="${MAP_STYLE.pinBorderColor}" stroke-width="2"/>
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
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };
    loadLocations();
  }, []);

  // Filter pins by state
  useEffect(() => {
    if (!selectedState) {
      setFilteredPins(locations);
      setMapLocked(false);
    } else {
      setFilteredPins(locations.filter(l => l.stateName === selectedState));
      setMapLocked(true);
    }
  }, [selectedState, locations]);

  // Set up the map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !stateVectorSource) return;

    mapRef.current.style.background = MAP_STYLE.backgroundColor;

    // State borders and labels layer
    const stateLayer = new VectorLayer({
      source: stateVectorSource,
      style: feature => [
        new Style({
          stroke: new Stroke({ color: MAP_STYLE.stateBorderColor, width: MAP_STYLE.stateBorderWidth }),
          fill: new Fill({ color: MAP_STYLE.stateFillColor })
        }),
        new Style({
          text: new Text({
            text: feature.get('NAME'),
            font: MAP_STYLE.stateLabelFont,
            fill: new Fill({ color: MAP_STYLE.stateLabelColor }),
            stroke: new Stroke({ color: MAP_STYLE.stateLabelStrokeColor, width: MAP_STYLE.stateLabelStrokeWidth }),
          })
        })
      ]
    });

    // Mailbox pins layer (filtered)
    const pinSource = new VectorSource();
    (selectedState ? locations.filter(l => l.stateName === selectedState) : locations).forEach(({ feature }) => pinSource.addFeature(feature));
    const pinLayer = new VectorLayer({ source: pinSource });
    pinLayerRef.current = pinLayer;

    // Create map
    const view = new View({
      center: fromLonLat([-98.5795, 39.8283]),
      zoom: 4,
      enableRotation: false,
    });
    setMapView(view);
    const map = new Map({
      target: mapRef.current,
      layers: [stateLayer, pinLayer],
      view,
      controls: [],
      interactions: [] // We'll add interactions below
    });

    // Add/Remove map interactions based on mapLocked
    import('ol/interaction').then(({ MouseWheelZoom, DoubleClickZoom, PinchZoom, DragPan }) => {
      map.addInteraction(new DragPan());
      map.addInteraction(new MouseWheelZoom());
      map.addInteraction(new DoubleClickZoom());
      map.addInteraction(new PinchZoom());
    });

    // --- Tooltip logic ---
    map.on('pointermove', (evt) => {
      if (map.hasFeatureAtPixel(evt.pixel)) {
        const features = map.getFeaturesAtPixel(evt.pixel);
        const pinFeature = features?.find(f => f.get('location'));
        if (pinFeature) {
          map.getTargetElement().style.cursor = 'pointer';
          const pe = evt.originalEvent as PointerEvent;
          setHoveredLocation(pinFeature.get('location'));
          setTooltipLocation({ x: pe.clientX, y: pe.clientY });
          return;
        }
      }
      map.getTargetElement().style.cursor = '';
      setHoveredLocation(null);
      setTooltipLocation(null);
    });

    // --- Click logic for pin: scroll to card in list if state selected, else do nothing ---
    map.on('click', (evt) => {
      if (!selectedState) return; // Only active in state mode
      if (map.hasFeatureAtPixel(evt.pixel)) {
        const features = map.getFeaturesAtPixel(evt.pixel);
        const pinFeature = features?.find(f => f.get('location'));
        if (pinFeature) {
          const location = pinFeature.get('location');
          setHighlightedCard(location.address);
          // Scroll to card
          setTimeout(() => {
            const ref = cardRefs.current[location.address];
            if (ref) {
              ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 50);
          return;
        }
      }
      setHighlightedCard(null);
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [stateVectorSource, locations, selectedState, mapLocked]);

  // --- Zoom and lock to state when selected ---
  useEffect(() => {
    if (!selectedState || !stateVectorSource || !mapView) {
      setStateExtent(null);
      return;
    }
    const stateFeature = stateVectorSource.getFeatures().find(f => f.get('NAME') === selectedState);
    if (stateFeature) {
      const geometry = stateFeature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        setStateExtent(extent);
        mapView.fit(extent, {
          duration: 1000,
          maxZoom: 8,
          padding: [40, 40, 40, 40]
        });
        // Constrain the view to the state extent
        mapView.setProperties({ extent, constrainOnlyCenter: true });
      }
    }
  }, [selectedState, stateVectorSource, mapView]);

  // Remove extent constraint when no state is selected
  useEffect(() => {
    if (!selectedState && mapView) {
      mapView.setProperties({ extent: undefined, constrainOnlyCenter: false });
    }
  }, [selectedState, mapView]);

  // Focus on state using vector layer
  const focusOnState = (stateName: string | null) => {
    if (!mapInstanceRef.current || !stateVectorSource) return;
    if (!stateName) {
      mapInstanceRef.current.getView().animate({
        center: fromLonLat([-98.5795, 39.8283]),
        zoom: 4,
        duration: 1000
      });
      setSelectedState(null);
      setShowAllStates(true);
      return;
    }
    const stateFeature = stateVectorSource.getFeatures().find(f => f.get('NAME') === stateName);
    if (stateFeature) {
      const geometry = stateFeature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        mapInstanceRef.current.getView().fit(extent, {
          duration: 1000,
          maxZoom: 8,
          padding: [40, 40, 40, 40]
        });
      }
      setSelectedState(stateName);
      setShowAllStates(false);
    }
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

  // In the mailbox pin style, use the config for pin color
  useEffect(() => {
    // Update pin styles if config changes
    locations.forEach(({ feature }) => {
      feature.setStyle(new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${MAP_STYLE.pinColor}" stroke="${MAP_STYLE.pinBorderColor}" stroke-width="2"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `)
        })
      }));
    });
  }, [locations]);

  // Dismiss side card when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectedLocation &&
        document.getElementById('side-card') &&
        !document.getElementById('side-card')!.contains(event.target as Node)
      ) {
        setSelectedLocation(null);
      }
    }
    if (selectedLocation) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedLocation]);

  // --- Layout: 3/4 map, 1/4 pane if state selected ---
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'row', position: 'relative', width: '100%' }}>
      {/* Side pane with list of cards for selected state */}
      {selectedState && (
        <div className="h-[600px] bg-white border-r border-gray-200 overflow-y-auto p-4" style={{ width: '25%', minWidth: 260, maxWidth: 400 }}>
          <h2 className="font-bold text-lg mb-4">{selectedState} Locations</h2>
          {filteredPins.length === 0 && <div className="text-gray-500 text-sm">No locations found.</div>}
          {filteredPins.map(({ location, cityName }, idx) => (
            <div
              key={cityName + idx}
              ref={el => { cardRefs.current[location.address] = el; }}
              className={`mb-4 p-3 rounded-lg border border-gray-200 shadow hover:shadow-md bg-orange-50 cursor-pointer transition ${highlightedCard === location.address ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setHighlightedCard(location.address)}
            >
              <div className="font-semibold text-gray-900 text-base mb-1">{location.address.split(',')[0]}</div>
              <div className="text-xs text-gray-600 mb-1">{location.address}</div>
              <div className="text-orange-600 font-medium text-xs mb-1">{location.price}</div>
              {location.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {location.badges.map((badge, i) => (
                    <span key={i} className="inline-block bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full">{badge}</span>
                  ))}
                </div>
              )}
              <a
                href={location.plan_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-orange-600 text-white text-xs px-2 py-1 rounded hover:bg-orange-700 transition-colors mt-1"
                onClick={e => e.stopPropagation()}
              >View Details</a>
            </div>
          ))}
        </div>
      )}
      {/* Map area (3/4 or full width) */}
      <div ref={mapContainerRef} style={{ width: selectedState ? '75%' : '100%', transition: 'width 0.3s' }}>
        <div 
          ref={mapRef} 
          className="w-full h-[600px] rounded-lg shadow-lg relative"
        />
        {/* Tooltip Card (on pin hover) */}
        {hoveredLocation && tooltipLocation && (
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              left: tooltipLocation.x + 10,
              top: tooltipLocation.y - 10,
              zIndex: 1000,
              pointerEvents: 'none',
              minWidth: 220,
              maxWidth: 320
            }}
            className="bg-white rounded-lg shadow-xl p-4 border border-gray-200 animate-fade-in"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">
                {hoveredLocation.address.split(',')[0]}
              </h3>
            </div>
            <p className="text-gray-600 text-xs mb-2">
              {hoveredLocation.address}
            </p>
            <p className="text-orange-600 font-medium text-sm mb-3">
              {hoveredLocation.price}
            </p>
            {hoveredLocation.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {hoveredLocation.badges.map((badge, index) => (
                  <span 
                    key={index}
                    className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* State Selection Control Panel - below the map, spaced lower */}
      <div className="w-full flex flex-col items-center" style={{ position: 'absolute', left: 0, top: 'calc(100% + 32px)', width: '100%' }}>
        <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              {selectedState ? `Showing: ${selectedState}` : 'All States'}
            </h3>
            <button
              onClick={() => { setHighlightedCard(null); focusOnState(null); }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                !selectedState 
                  ? 'bg-orange-600 text-white' 
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
                onClick={() => { setHighlightedCard(null); focusOnState(stateName); }}
                className={`text-xs px-3 py-2 rounded-full transition-colors border ${
                  selectedState === stateName
                    ? 'bg-orange-600 text-white border-orange-600'
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