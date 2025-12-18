
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    // If lat and lon are provided (from browser's Geolocation API)
    if (lat && lon) {
      // Using a reverse geocoding service (Nominatim from OpenStreetMap)
      const reverseGeoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      
      if (!reverseGeoResponse.ok) {
          throw new Error('Falha ao contatar o serviço de geocodificação reversa.');
      }

      const reverseGeoData = await reverseGeoResponse.json();

      if (reverseGeoData.error) {
        return NextResponse.json({ error: 'Não foi possível determinar a cidade a partir das coordenadas.', details: reverseGeoData.error }, { status: 404 });
      }

      const city = reverseGeoData.address.city || reverseGeoData.address.town || reverseGeoData.address.village;
      
      if (!city) {
        return NextResponse.json({ error: 'Cidade não encontrada nas coordenadas fornecidas.' }, { status: 404 });
      }

      return NextResponse.json({ city: city });
    }

    // Fallback to IP-based geolocation if lat/lon are not provided
    const ip = request.headers.get('x-forwarded-for') ?? request.ip;
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,city`);
    
    if (!geoResponse.ok) {
        throw new Error('Falha ao contatar o serviço de geolocalização por IP.');
    }
    const geoData = await geoResponse.json();

    if (geoData.status === 'fail') {
        return NextResponse.json({ error: 'Não foi possível determinar a cidade por IP.', details: geoData.message }, { status: 404 });
    }
    
    return NextResponse.json({ city: geoData.city });

  } catch (error: any) {
    console.error("Erro na API de geolocalização:", error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
