import React from 'react';
import type { StateLocation } from './Map';

interface LocationCardProps {
  location: StateLocation;
  country?: string;
  city?: string;
  region?: string;
  mode: 'US' | 'International';
  selected: boolean;
  onSelect: (location: StateLocation) => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, country, city, region, mode, selected, onSelect }) => {
  return (
    <div
      className={`mb-2 p-5 rounded-xl border border-gray-200 shadow-sm bg-white hover:shadow-lg cursor-pointer transition-all duration-200 flex flex-col gap-2 group relative ${selected ? 'ring-2 ring-green-400' : ''}`}
      onClick={() => onSelect(location)}
      style={{ minHeight: 110 }}
    >
      <div className="font-bold text-lg text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
        {location.title || location.address?.split('\n')[0] || city || region || country}
      </div>
      <div className="text-xs text-gray-500 mb-1">
        {mode === 'US' ? location.address : `${country || ''}${city ? `, ${city}` : ''}${region ? `, ${region}` : ''}`}
      </div>
      <div className="text-green-700 font-extrabold text-base mb-1">
        ${location.price.amount} {location.price.currency === 'USD' ? '/month' : location.price.currency}
      </div>
      <div className="flex-1" />
      <button
        className="w-full cursor-pointer bg-green-600 font-bold text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700 transition-colors mt-2 shadow"
        onClick={e => { e.stopPropagation(); onSelect(location); }}
      >
        View Details
      </button>
    </div>
  );
};

export default LocationCard; 