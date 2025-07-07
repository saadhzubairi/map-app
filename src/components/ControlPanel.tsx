import React from 'react';

interface ControlPanelProps {
  mode: 'US' | 'International';
  items: string[];
  selected: string | null;
  onSelect: (item: string) => void;
  onShowAll: () => void;
  label: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ mode, items, selected, onSelect, onShowAll, label }) => {
  return (
    <div className="w-full h-full flex flex-col items-center mb-8">
      <div className="h-full">
        <div className="mx-4 pr-4 pl-8 shadow-sm rounded-full border  flex items-center justify-between mb-3">
          <h3 className="font-black text-gray-600 my-4 text-xl tracking-tight">{label}</h3>
          <button
            onClick={onShowAll}
            className={`text-xs px-4 py-2 font-bold cursor-pointer hover:bg-green-900 hover:text-white rounded-full transition-colors shadow ${
              !selected
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Show All
          </button>
        </div>
        <div className="flex flex-wrap gap-3 h-[70%] py-2 overflow-y-scroll justify-center">
          {items.map((item) => (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className={`text-xs px-4 py-2 rounded-full cursor-pointer hover:bg-green-900 hover:text-white hover:border-green-900 transition-colors border font-semibold shadow-sm ${
                selected === item
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel; 