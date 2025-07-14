import MapComponent from '@/components/Map';
import MapPdfButtons from '@/components/MapPdfButtons';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between items-center">
      <div className="container flex flex-col h-[65vh] justify-between items-center mx-auto px-4 py-8">
        <div className="text-center mb-10 mt-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Anytime Mailbox Locations
          </h1>
          <p className="text-gray-600 text-lg">
            Find mailbox locations across the United States
          </p>
        </div>
        <MapComponent />
        <MapPdfButtons className="mt-4" />
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Click on any pin to view location details</p>
        </div>
      </div>
    </main>
  );
}
