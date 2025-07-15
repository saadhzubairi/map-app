/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Icon, Stroke, Fill, Text } from 'ol/style';
import { Select } from 'ol/interaction';
import { click } from 'ol/events/condition';
import GeoJSON from 'ol/format/GeoJSON';
import { boundingExtent } from 'ol/extent';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import type { Feature as FeatureType } from 'ol';
import type Geometry from 'ol/geom/Geometry';
import LocationModal from './LocationModal';
import LocationCard from './LocationCard';
import ControlPanel from './ControlPanel';
import CustomMapLayout from './CustomMapLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import PdfExportDialogButton from './PdfExportDialog';

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
  backgroundColor: '#fafafa', // Tailwind slate-50

  // State border
  stateBorderColor: '#666',
  stateBorderWidth: 0.5,

  // State fill
  stateFillColor: '#eceff1', // almost transparent

  // State label
  stateLabelColor: '#222',
  stateLabelFont: 'bold 14px sans-serif',
  stateLabelStrokeColor: '#78909c',
  stateLabelStrokeWidth: 1,

  pinColor: '#43a047',
  pinBorderColor: '#1b5e20',
};

// Helper to get all state JSON filenames
const STATE_JSONS = [
  'us_state_alabama.json', 'us_state_alaska.json', 'us_state_arizona.json', 'us_state_arkansas.json', 'us_state_california.json', 'us_state_colorado.json', 'us_state_connecticut.json', 'us_state_delaware.json', 'us_state_district_of_columbia.json',  'us_state_florida.json', 'us_state_georgia.json', 'us_state_hawaii.json', 'us_state_idaho.json', 'us_state_illinois.json', 'us_state_indiana.json', 'us_state_iowa.json', 'us_state_kansas.json', 'us_state_kentucky.json', 'us_state_louisiana.json', 'us_state_maine.json', 'us_state_maryland.json', 'us_state_massachusetts.json', 'us_state_michigan.json', 'us_state_minnesota.json', 'us_state_mississippi.json', 'us_state_missouri.json', 'us_state_montana.json', 'us_state_nebraska.json', 'us_state_nevada.json', 'us_state_new_hampshire.json', 'us_state_new_jersey.json', 'us_state_new_mexico.json', 'us_state_new_york.json', 'us_state_north_carolina.json', 'us_state_north_dakota.json', 'us_state_ohio.json', 'us_state_oklahoma.json', 'us_state_oregon.json', 'us_state_pennsylvania.json', 'us_state_puerto_rico.json', 'us_state_rhode_island.json', 'us_state_south_carolina.json', 'us_state_south_dakota.json', 'us_state_tennessee.json', 'us_state_texas.json', 'us_state_utah.json', 'us_state_vermont.json', 'us_state_virginia.json', 'us_state_washington.json', 'us_state_west_virginia.json', 'us_state_wisconsin.json', 'us_state_wyoming.json',
];

// New Location type for per-state JSONs
interface Plan {
  title: string;
  monthly_price: { amount: number; currency: string };
  yearly_price: { amount: number; currency: string };
  features: Record<string, string>;
  detailed_features: Record<string, any>;
  service_plan_id: string;
}
interface LocationInfo {
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
export interface StateLocation {
  title: string;
  price: { amount: number; currency: string };
  address: string;
  latitude: string;
  longitude: string;
  plan_url: string;
  is_premier: boolean;
  plans: Plan[];
  location_info: LocationInfo;
}

const INTL_SINGLE_FILES = [
  'austria_single_location.json', 'belgium_single_location.json', 'colombia_single_location.json', 'cyprus_single_location.json', 'denmark_single_location.json', 'egypt_single_location.json', 'hungary_single_location.json', 'india_single_location.json', 'italy_single_location.json', 'kenya_single_location.json', 'lithuania_single_location.json', 'malta_single_location.json', 'mauritius_single_location.json', 'netherlands_single_location.json', 'oman_single_location.json', 'pakistan_single_location.json', 'slovakia_single_location.json', 'slovenia_single_location.json', 'sweden_single_location.json', 'taiwan_single_location.json', 'thailand_single_location.json', 'united_arab_emirates_single_location.json', 'zambia_single_location.json',
];
const INTL_MULTI_FILES = [
  'australia_multi_locations.json', 'brazil_multi_locations.json', 'bulgaria_multi_locations.json', 'canada_multi_locations.json', 'caribbean_multi_locations.json', 'china_multi_locations.json', 'croatia_multi_locations.json', 'czech_republic_multi_locations.json', 'france_multi_locations.json', 'greece_multi_locations.json', 'hong_kong_multi_locations.json', 'indonesia_multi_locations.json', 'ireland_multi_locations.json', 'malaysia_multi_locations.json', 'mexico_multi_locations.json', 'nigeria_multi_locations.json', 'philippines_multi_locations.json', 'portugal_multi_locations.json', 'romania_multi_locations.json', 'singapore_multi_locations.json', 'south_africa_multi_locations.json', 'spain_multi_locations.json', 'switzerland_multi_locations.json', 'ukraine_multi_locations.json', 'united_kingdom_multi_locations.json',
];

export default function MapComponent({ className = '' }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<StateLocation | null>(null);
  const [locations, setLocations] = useState<Array<{ feature: FeatureType<Geometry>; location: StateLocation; cityName: string; stateName: string }>>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [showAllStates, setShowAllStates] = useState(true);
  const [stateVectorSource, setStateVectorSource] = useState<VectorSource | null>(null);
  const [tooltipLocation, setTooltipLocation] = useState<{ x: number; y: number } | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<StateLocation | null>(null);
  const [filteredPins, setFilteredPins] = useState<typeof locations>([]);
  const [mapLocked, setMapLocked] = useState(false);
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pinLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [address: string]: HTMLDivElement | null }>({});
  const [mapView, setMapView] = useState<View | null>(null);
  const [stateExtent, setStateExtent] = useState<number[] | null>(null);
  const [mode, setMode] = useState<'US' | 'International'>('US');
  const [intlCountries, setIntlCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [usLocations, setUsLocations] = useState<Array<{ feature: FeatureType<Geometry>; location: StateLocation; cityName: string; stateName: string }>>([]);
  const [intlLocations, setIntlLocations] = useState<Array<{ feature: FeatureType<Geometry>; location: StateLocation; country: string; city?: string; region?: string }>>([]);
  const [usLoaded, setUsLoaded] = useState(false);
  const [intlLoaded, setIntlLoaded] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Hotkey: Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset highlight when dialog opens or query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchOpen, searchQuery]);

  // Load US states GeoJSON and set up the vector source
  useEffect(() => {
    const source = new VectorSource();
    fetch('/us-states.json')
      .then(res => res.json())
      .then(data => {
        const features = new GeoJSON().readFeatures(data, {
          featureProjection: 'EPSG:3857',
        }) as FeatureType<Geometry>[];
        source.addFeatures(features);
        setStateVectorSource(source);
        // Set state names for control panel
        setStates(features.map(f => f.get('NAME')).sort());
      });
  }, []);

  // Preload all US and International data on mount
  useEffect(() => {
    // US locations
    const loadAllStates = async () => {
      try {
        const allLocations: Array<{ feature: FeatureType<Geometry>; location: StateLocation; cityName: string; stateName: string }> = [];
        await Promise.all(
          STATE_JSONS.map(async (filename) => {
            const res = await fetch(`/us_states/${filename}`);
            if (!res.ok) return;
            const data = await res.json();
            const stateName = data.state;
            const stateData = data.state_data;
            if (!stateData || !stateData.cities) return;
            for (const city of stateData.cities) {
              const cityName = city.city_name;
              for (const location of city.locations) {
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
              }
            }
          })
        );
        setUsLocations(allLocations);
        setUsLoaded(true);
      } catch (err) {
        console.error('Error loading state locations:', err);
      }
    };
    // International locations
    const loadIntl = async () => {
      const allIntl: Array<{ feature: FeatureType<Geometry>; location: StateLocation; country: string; city?: string; region?: string }> = [];
      const countrySet = new Set<string>();
      // Single-location files
      await Promise.all(
        INTL_SINGLE_FILES.map(async (filename) => {
          const res = await fetch(`/internationalLocationsS/${filename}`);
          if (!res.ok) return;
          const data = await res.json();
          const country = data.state;
          const stateData = data.state_data;
          if (!stateData || !stateData.cities) return;
          
          // Add country to set even if no coordinates (for PDF export)
          countrySet.add(country);
          
          for (const city of stateData.cities) {
            for (const location of city.locations) {
              if (location.latitude && location.longitude) {
                const feature = new Feature({
                  geometry: new Point(fromLonLat([parseFloat(location.longitude), parseFloat(location.latitude)])),
                  name: city.city_name,
                  country,
                  location
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
                allIntl.push({ feature, location, country, city: city.city_name });
              }
            }
          }
        })
      );
      // Multi-location files
      await Promise.all(
        INTL_MULTI_FILES.map(async (filename) => {
          const res = await fetch(`/InternationalLocationsR/${filename}`);
          if (!res.ok) return;
          const data = await res.json();
          const country = data.country;
          if (!data.regions) return;
          
          // Add country to set even if no coordinates (for PDF export)
          countrySet.add(country);
          
          for (const region of data.regions) {
            for (const location of region.locations) {
              if (location.latitude && location.longitude) {
                const feature = new Feature({
                  geometry: new Point(fromLonLat([parseFloat(location.longitude), parseFloat(location.latitude)])),
                  name: location.name || location.title || '',
                  country,
                  location
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
                allIntl.push({ feature, location, country, region: region.region });
              }
            }
          }
        })
      );
      setIntlLocations(allIntl);
      setIntlCountries(Array.from(countrySet).sort());
      setIntlLoaded(true);
    };
    loadAllStates();
    loadIntl();
  }, []);

  // Use preloaded data for rendering
  useEffect(() => {
    setLocations(usLocations);
  }, [usLocations]);

  // Filter pins by state
  useEffect(() => {
    if (!selectedState) {
      setFilteredPins([]);
      setMapLocked(false);
    } else {
      setFilteredPins(usLocations.filter(l => l.stateName === selectedState));
      setMapLocked(true);
    }
  }, [selectedState, usLocations]);

  // Set up the map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapRef.current.style.background = MAP_STYLE.backgroundColor;

    // --- US State Layer ---
    let stateLayer: VectorLayer<VectorSource> | null = null;
    if (mode === 'US' && stateVectorSource) {
      stateLayer = new VectorLayer({
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
    }

    // --- Pin Layer ---
    const pinSource = new VectorSource();
    if (mode === 'US') {
      (selectedState ? usLocations.filter(l => l.stateName === selectedState) : usLocations).forEach(({ feature }) => pinSource.addFeature(feature));
    } else if (mode === 'International') {
      intlLocations.forEach(({ feature }) => pinSource.addFeature(feature));
    }
    const pinLayer = new VectorLayer({ source: pinSource });
    pinLayerRef.current = pinLayer;

    // --- Map View ---
    let center = fromLonLat([-98.5795, 39.8283]);
    let zoom = 4;
    if (mode === 'International') {
      center = fromLonLat([10, 20]); // Center globally
      zoom = 2;
    }
    const view = new View({
      center,
      zoom,
      enableRotation: false,
    });
    setMapView(view);
    const map = new Map({
      target: mapRef.current,
      layers: stateLayer ? [stateLayer, pinLayer] : [pinLayer],
      view,
      controls: [],
      interactions: []
    });

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

    // --- Click logic for pin ---
    map.on('click', (evt) => {
      if (mode === 'US' && !selectedState) return; // Only active in state mode
      if (map.hasFeatureAtPixel(evt.pixel)) {
        const features = map.getFeaturesAtPixel(evt.pixel);
        const pinFeature = features?.find(f => f.get('location'));
        if (pinFeature) {
          const location = pinFeature.get('location');
          setHighlightedCard(location.address);
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

    // --- World country outlines layer (International mode only) ---
    if (mode === 'International') {
      fetch('/world-countries.json')
        .then(res => res.json())
        .then(data => {
          const features = new GeoJSON().readFeatures(data, {
            featureProjection: 'EPSG:3857',
          }) as Feature<Geometry>[];
          const worldLayer = new VectorLayer({
            source: new VectorSource({
              features,
            }),
            style: new Style({
              stroke: new Stroke({ color: '#bbb', width: 1 }),
              fill: new Fill({ color: 'rgba(200,200,200,0.07)' }),
            }),
            zIndex: 0,
          });
          map.getLayers().insertAt(0, worldLayer);
        });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [stateVectorSource, usLocations, selectedState, mapLocked, mode, intlLocations]);

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
    usLocations.forEach(({ feature }) => {
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
  }, [usLocations]);

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

  // Pin click handler to open modal with tier info
  const handlePinClick = (location: StateLocation) => {
    setSelectedLocation(location);
  };

  // Remove fetches from tab switch handlers and use preloaded data for both modes.
  // Add before the render/return statement:
  const filteredIntlPins: Array<{ feature: FeatureType<Geometry>; location: StateLocation; country: string; city?: string; region?: string }> = selectedCountry ? intlLocations.filter(l => l.country === selectedCountry) : intlLocations;

  // When states are loaded, select the first state by default in US mode
  useEffect(() => {
    if (mode === 'US' && states.length > 0 && !selectedState) {
      setSelectedState(states[0]);
    }
  }, [mode, states, selectedState]);

  // When switching to US mode, always select the first state
  const handleModeSwitch = (newMode: 'US' | 'International') => {
    setMode(newMode);
    if (newMode === 'US' && states.length > 0) {
      setSelectedState(states[0]);
    }
    if (newMode === 'International') {
      setSelectedState(null);
    }
  };

  // Filtered search results
  const filteredStates = states.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCountries = intlCountries.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

  // Flattened results for keyboard navigation
  const searchResults = useMemo(() => [
    ...filteredStates.map(s => ({ type: "US" as const, value: s, section: "US States" })),
    ...filteredCountries.map(c => ({ type: "International" as const, value: c, section: "International" })),
  ], [filteredStates, filteredCountries]);

  // Handle search result click
  const handleSearchSelect = (type: 'US' | 'International', value: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (type === 'US') {
      setMode('US');
      setSelectedState(value);
    } else {
      setMode('International');
      setSelectedCountry(value);
    }
  };

  // Keyboard navigation for search results
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (searchResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(i => (i + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(i => (i - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        if (searchResults[highlightedIndex]) {
          e.preventDefault();
          const { type, value } = searchResults[highlightedIndex];
          handleSearchSelect(type, value);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen, searchResults, highlightedIndex]);

  // --- Layout: 3/4 map, 1/4 pane if state/country selected ---
  return (
    <div className={className + " w-full flex flex-col items-center justify-center bg-white"}>
      {/* Main content row: sidebar + map + selector */}
      <div className={`flex flex-row justify-center items-center w-full max-w-[1600px] mx-auto gap-8 bg-gray-50 ${!showMap ? 'transition-all' : ''}`}>
        {/* Sidebar: Location cards */}

        {((mode === 'US' && selectedState) || mode === 'International') && (
          <div className={`rounded-2xl flex flex-col justify-between items-center pb-6 pt-2 h-[700px] max-h-[80vh] ${showMap ? 'w-[400px]' : 'w-[900px]'} shadow-xl`}>
            <div className={`  max-h-[60vh] overflow-y-auto p-6 transition-all duration-300`}>
              <h2 className="font-extrabold text-2xl mb-2 text-center text-green-700 tracking-tight">
                {mode === 'US' && selectedState ? `${selectedState} Locations` : selectedCountry ? `${selectedCountry} Locations` : 'International Locations'}
              </h2>
              {(mode === 'US' && selectedState ? filteredPins.length === 0 : filteredIntlPins.length === 0) ? (
                <div className="text-gray-400 text-base text-center">No locations found.</div>
              ) : (
                <div className={`grid gap-4 ${showMap ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {(mode === 'US' && selectedState ? filteredPins : filteredIntlPins).map((item: any, idx: number) => {
                    // Generate a unique key and ref id for each card
                    const addressKey = (item.location.address ? item.location.address.replace(/\s+/g, '') : '') +
                      '_' + (item.location.latitude || '') +
                      '_' + (item.location.longitude || '') +
                      '_' + idx;
                    return (
                      <LocationCard
                        key={addressKey}
                        location={item.location}
                        country={item.country}
                        city={item.city}
                        region={item.region}
                        mode={mode}
                        selected={selectedLocation === item.location}
                        highlighted={highlightedCard === item.location.address}
                        onSelect={setSelectedLocation}
                        ref={(el: HTMLDivElement | null) => { cardRefs.current[item.location.address] = el; }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center py-3">
              <PdfExportDialogButton
                mode={mode.toLowerCase() as 'us' | 'international'}
                selected={selectedState}
                usStates={states}
                intlCountries={intlCountries}
              />
            </div>
            {/*<div className="flex items-center justify-center py-3">
              <MapPdfButtons />
            </div>*/}
          </div>
        )}

        {/* Map area (conditionally rendered) */}
        {showMap && (
          <CustomMapLayout mapRef={mapRef} mapContainerRef={mapContainerRef}>
            {/* Tooltip and overlays can be added here if needed */}
          </CustomMapLayout>
        )}
        {/* Tooltip for pin hover */}
        {showMap && hoveredLocation && tooltipLocation && (
          <div
            style={{
              position: 'fixed',
              left: tooltipLocation.x + 16,
              top: tooltipLocation.y + 8,
              zIndex: 1000,
              pointerEvents: 'none',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '0.5rem 1rem',
              minWidth: 220,
              maxWidth: 320,
              fontSize: '0.95rem',
              color: '#222',
              fontWeight: 500,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>
              {hoveredLocation.title || hoveredLocation.address?.split('\n')[0] || 'Location'}
            </div>
            <div style={{ fontSize: '0.92rem', color: '#555' }}>
              {hoveredLocation.address}
            </div>
          </div>
        )}
        {/* Right panel: Toggle + Country/State Selector */}
        <div className={`h-[700px] max-h-[80vh] w-[340px] shadow-xl rounded-2xl bg-white border border-gray-100  p-2 flex flex-col gap-4 justify-start transition-all duration-300`}>
          {/* Toggle at the top of the control panel */}
          <div className="w-full flex flex-col items-center my-2 z-30 gap-2">
            <div className="flex items-center gap-4 bg-white rounded-full shadow-lg px-8 py-3 border border-gray-200">
              <button
                className={`cursor-pointer px-6 py-2 rounded-full font-bold text-base transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 ${mode === 'US' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleModeSwitch('US')}
              >
                US
              </button>
              <button
                className={`cursor-pointer px-6 py-2 rounded-full font-bold text-base transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 ${mode === 'International' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleModeSwitch('International')}
              >
                International
              </button>
            </div>
            {/* Show Map toggle */}
            <div className="flex items-center gap-2 mt-2">
              <label htmlFor="show-map-toggle" className="text-gray-700 font-medium text-base select-none">Show Map</label>
              <input
                id="show-map-toggle"
                type="checkbox"
                checked={showMap}
                onChange={e => setShowMap(e.target.checked)}
                className="w-5 h-5 accent-green-600 cursor-pointer"
              />
            </div>
          </div>
          {mode === 'International' && (
            <ControlPanel
              items={intlCountries}
              selected={selectedCountry}
              onSelect={setSelectedCountry}
              onShowAll={() => setSelectedCountry(null)}
              label="All Countries"
            />
          )}
          {mode === 'US' && (
            <ControlPanel
              items={states}
              selected={selectedState}
              onSelect={(stateName) => {
                setHighlightedCard(null);
                if (showMap) {
                  focusOnState(stateName);
                } else {
                  setSelectedState(stateName);
                }
              }}
              onShowAll={() => { setHighlightedCard(null); focusOnState(null); }}
              label="All States"
            />
          )}
        </div>
      </div>
      <LocationModal
        location={selectedLocation}
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
      {/* Search Dialog (Ctrl+K) */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent showCloseButton className="bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Search Locations</DialogTitle>
          </DialogHeader>
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for a US state or international country..."
            className="mb-4 text-lg px-4 py-2"
            autoFocus
          />
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">US States</div>
              {filteredStates.length === 0 ? (
                <div className="text-gray-400 text-sm">No states found.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredStates.map((state, idx) => {
                    const globalIdx = idx;
                    const isHighlighted = highlightedIndex === globalIdx;
                    return (
                      <li key={state}>
                        <button
                          className={`w-full text-left px-3 py-2 rounded transition-colors font-medium text-gray-800 focus:bg-green-100 focus:outline-none ${isHighlighted ? 'bg-green-100' : 'hover:bg-green-50'}`}
                          onClick={() => handleSearchSelect('US', state)}
                        >
                          {state}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">International</div>
              {filteredCountries.length === 0 ? (
                <div className="text-gray-400 text-sm">No countries found.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredCountries.map((country, idx) => {
                    const globalIdx = filteredStates.length + idx;
                    const isHighlighted = highlightedIndex === globalIdx;
                    return (
                      <li key={country}>
                        <button
                          className={`w-full text-left px-3 py-2 rounded transition-colors font-medium text-gray-800 focus:bg-green-100 focus:outline-none ${isHighlighted ? 'bg-green-100' : 'hover:bg-green-50'}`}
                          onClick={() => handleSearchSelect('International', country)}
                        >
                          {country}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-4 text-center">Press <kbd className="px-1 py-0.5 bg-gray-200 rounded border text-xs font-mono">Ctrl+K</kbd> to open this search anytime.</div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 