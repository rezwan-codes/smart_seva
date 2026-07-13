const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  if (cache.has(address)) {
    return cache.get(address)!;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    if (!response.ok) {
      cache.set(address, null);
      return null;
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      const result = { lat, lng };
      cache.set(address, result);
      return result;
    }

    cache.set(address, null);
    return null;
  } catch {
    cache.set(address, null);
    return null;
  }
}
