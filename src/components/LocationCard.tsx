import React, { forwardRef } from 'react';
import type { StateLocation } from './Map';

interface LocationCardProps {
  location: StateLocation;
  country?: string;
  city?: string;
  region?: string;
  mode: 'US' | 'International';
  selected: boolean;
  highlighted?: boolean;
  onSelect: (location: StateLocation) => void;
}

const LocationCard = forwardRef<HTMLDivElement, LocationCardProps>(
  ({ location, country, city, region, mode, selected, highlighted = false, onSelect }, ref) => {
    return (
      <div
        ref={ref}
        className={`w-84 group hover:ring-2 hover:ring-green-400 border flex cursor-pointer flex-col p-4 gap-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ${selected ? 'ring-2 ring-green-400' : ''} ${highlighted ? 'ring-4 ring-green-500' : ''}`}
        onClick={() => onSelect(location)}
      >
        <div className="font-bold text-lg text-gray-900 group-hover:text-green-700 transition-colors">
          {location.title || location.address?.split('\n')[0] || city || region || country}
        </div>
        <div className="text-xs text-gray-500">
          {mode === 'US' ? location.address : `${country || ''}${city ? `, ${city}` : ''}${region ? `, ${region}` : ''}`}
        </div>
        <button
          className="w-full cursor-pointer bg-green-600 font-bold text-white text-sm px-4 py-2 rounded-lg group-hover:bg-green-700 transition-colors shadow"
          onClick={e => { e.stopPropagation(); onSelect(location); }}
        >
          View Details
        </button>
      </div>
    );
  }
);

LocationCard.displayName = 'LocationCard';

export default LocationCard; 