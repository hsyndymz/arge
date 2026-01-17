import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface ParsedQuarry {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

export async function parseKML(kmlContent: string): Promise<ParsedQuarry[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(kmlContent);
  const quarries: ParsedQuarry[] = [];

  const kml = parsed.kml || parsed;
  const document = kml.Document || kml;
  const placemarks = document.Placemark || [];

  const placemarksArray = Array.isArray(placemarks) ? placemarks : [placemarks];

  for (const placemark of placemarksArray) {
    if (!placemark) continue;

    const name = placemark.name || 'Unnamed';
    const description = placemark.description || '';
    
    let imageUrl = '';
    if (description && typeof description === 'string') {
      const imgMatch = description.match(/src="([^"]+)"/);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }

    const point = placemark.Point;
    if (point && point.coordinates) {
      const coords = point.coordinates.toString().trim().split(',');
      if (coords.length >= 2) {
        const longitude = parseFloat(coords[0]);
        const latitude = parseFloat(coords[1]);

        if (!isNaN(latitude) && !isNaN(longitude)) {
          quarries.push({
            name,
            latitude,
            longitude,
            description: description.replace(/<[^>]*>/g, '').trim() || undefined,
            imageUrl: imageUrl || undefined,
          });
        }
      }
    }
  }

  return quarries;
}

export async function parseKMZ(kmzBuffer: Buffer): Promise<ParsedQuarry[]> {
  const zip = new JSZip();
  const unzipped = await zip.loadAsync(kmzBuffer);

  let kmlContent = '';
  for (const filename of Object.keys(unzipped.files)) {
    if (filename.toLowerCase().endsWith('.kml')) {
      kmlContent = await unzipped.files[filename].async('string');
      break;
    }
  }

  if (!kmlContent) {
    throw new Error('No KML file found in KMZ archive');
  }

  return parseKML(kmlContent);
}

export async function parseKMLOrKMZ(
  buffer: Buffer,
  filename: string
): Promise<ParsedQuarry[]> {
  const isKMZ = filename.toLowerCase().endsWith('.kmz');
  
  if (isKMZ) {
    return parseKMZ(buffer);
  } else {
    return parseKML(buffer.toString('utf-8'));
  }
}
