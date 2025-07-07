import React, { RefObject } from 'react';

interface CustomMapLayoutProps {
  mapRef: RefObject<HTMLDivElement | null>;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}

const CustomMapLayout: React.FC<CustomMapLayoutProps> = ({ mapRef, mapContainerRef, children }) => {
  return (
    <div ref={mapContainerRef} className="flex-1 flex flex-col items-center justify-center" style={{ maxHeight: '700px', minWidth: 0 }}>
      <div
        ref={mapRef}
        className="w-full h-[700px] max-h-[80vh] rounded-2xl shadow-xl bg-white border border-gray-100 relative"
      />
      {children}
    </div>
  );
};

export default CustomMapLayout; 