# Anytime Mailbox Locations Map

A sophisticated Next.js web application that displays Anytime Mailbox locations across the United States on an interactive map.

## Features

- **Interactive Map**: Built with OpenLayers for smooth performance and minimal dependencies
- **Location Pins**: All mailbox locations are displayed as pins on the map
- **Hover Cards**: Click on any pin to view detailed location information
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Clean UI**: Modern, minimalist design with Tailwind CSS

## Data Source

The application uses location data from `public/anytime_mailbox_locations.json`, which contains:
- 1,964 mailbox locations across the United States
- Detailed information including addresses, prices, and badges
- Latitude and longitude coordinates for precise mapping

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **View the Map**: The map loads centered on the United States with all mailbox locations displayed as blue pins
2. **Interact with Pins**: Click on any pin to view a detailed card with:
   - Location name and address
   - Monthly pricing information
   - Special badges (if any)
   - Link to view more details on the Anytime Mailbox website
3. **Close Cards**: Click the × button or click elsewhere on the map to close the location card

## Technical Details

### Technologies Used

- **Next.js 15**: React framework with App Router
- **OpenLayers**: Open-source mapping library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework

### Map Configuration

The map uses minimal OpenLayers settings:
- OpenStreetMap tiles for the base layer
- Vector layer for location pins
- Custom SVG pin icons
- Click interaction for pin selection

### Data Structure

The JSON file contains a hierarchical structure:
```json
{
  "scraped_at": "2025-06-29 23:10:17",
  "total_locations": 1964,
  "states": {
    "StateName": {
      "url": "state_url",
      "location_count": 10,
      "cities": {
        "CityName": {
          "price": "Starting from US$ 14.99 / month",
          "address": "Full address",
          "plan_url": "https://...",
          "latitude": "33.339528",
          "longitude": "-86.9139148",
          "badges": ["Vanity Address", "Top Rated"],
          "details": {}
        }
      }
    }
  }
}
```

## Customization

### Styling
- Modify `src/components/Map.tsx` to change pin styles, colors, or card layout
- Update `src/app/globals.css` for global styling changes
- The map uses Tailwind CSS classes for responsive design

### Map Settings
- Adjust the initial zoom level and center coordinates in the Map component
- Modify the pin icon SVG in the feature style configuration
- Add additional map controls or interactions as needed

## License

This project is for educational and demonstration purposes.

## Contributing

Feel free to submit issues and enhancement requests!
