import MapComponent from '@/components/Map';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Anytime Mailbox Locations
          </h1>
          <p className="text-gray-600 text-lg">
            Find mailbox locations across the United States
          </p>
        </div>
        
        <MapComponent className="w-full" />
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Click on any pin to view location details</p>
        </div>
      </div>
    </main>
  );
}
