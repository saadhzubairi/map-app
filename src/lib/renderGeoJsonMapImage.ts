import { createCanvas } from 'canvas';
import fs from 'fs';

interface Pin {
  latitude: string;
  longitude: string;
  label?: string;
}

export async function renderGeoJsonMapImage({ geojsonPath, pins, country }: { geojsonPath: string, pins: Pin[], country: string }) {
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  const width = 800, height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- Fill background with light purple ---
  ctx.fillStyle = '#ffffff'; // light purple
  ctx.fillRect(0, 0, width, height);

  // --- Calculate bbox around pins, with margin ---
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  pins.forEach(pin => {
    const lon = parseFloat(pin.longitude);
    const lat = parseFloat(pin.latitude);
    if (lon < minX) minX = lon;
    if (lon > maxX) maxX = lon;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  });
  // Add margin (in degrees)
  const margin = 5;
  minX -= margin; maxX += margin; minY -= margin; maxY += margin;

  // --- Aspect ratio correction ---
  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const canvasAspect = width / height;
  const bboxAspect = bboxWidth / bboxHeight;

  if (bboxAspect > canvasAspect) {
    // bbox is too wide, expand height
    const desiredHeight = bboxWidth / canvasAspect;
    const extra = (desiredHeight - bboxHeight) / 2;
    minY -= extra;
    maxY += extra;
  } else {
    // bbox is too tall, expand width
    const desiredWidth = bboxHeight * canvasAspect;
    const extra = (desiredWidth - bboxWidth) / 2;
    minX -= extra;
    maxX += extra;
  }

  function project([lon, lat]: [number, number]) {
    return [
      ((lon - minX) / (maxX - minX)) * width,
      height - ((lat - minY) / (maxY - minY)) * height
    ];
  }

  // Draw borders
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  geojson.features.forEach((f: unknown) => {
    const feature = f as { geometry: { type: string; coordinates: unknown } };
    const coords = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    (coords as unknown[][]).forEach((poly: unknown) => {
      ctx.beginPath();
      const polyCoords = (poly as number[][])[0];
      for (let i = 0; i < polyCoords.length; i++) {
        const coord = polyCoords[i] as unknown as number[];
        const [lon, lat] = coord;
        const [x, y] = project([lon, lat]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });
  });

  // Draw pins
  pins.forEach(pin => {
    const [x, y] = project([parseFloat(pin.longitude), parseFloat(pin.latitude)]);
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = 'bold 16px sans-serif';
    if (pin.label) ctx.fillText(pin.label, x + 8, y - 8);
  });

  // Add country/state name
  ctx.fillStyle = 'black';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(country, 30, 50);

  return canvas.toDataURL(); // returns a base64 data URI
} 