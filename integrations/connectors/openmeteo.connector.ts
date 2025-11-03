/**
 * Open-Meteo Connector - External Intelligence Feed System
 * Built from absolute zero - zero templates
 * 
 * Fetches weather and climate data from Open-Meteo.com
 */

import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, ExternalData, ConnectorKnowledge } from '../types';

export class OpenMeteoConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super(config);
  }

  /**
   * Fetch weather data from Open-Meteo
   * Using major cities as examples
   */
  protected async fetch(): Promise<ExternalData> {
    // Major cities coordinates
    const cities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'London', lat: 51.5074, lon: -0.1278 },
      { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093 }
    ];

    const weatherData = await Promise.all(
      cities.map(async (city) => {
        const params = new URLSearchParams({
          latitude: city.lat.toString(),
          longitude: city.lon.toString(),
          current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
          timezone: 'auto'
        });

        const url = `${this.config.baseUrl}/v1/forecast?${params}`;
        
        try {
          const data = await this.httpRequest(url);
          return { city: city.name, ...data };
        } catch (error) {
          console.warn(`[${this.config.id}] Failed to fetch ${city.name}:`, error);
          return null;
        }
      })
    );

    return {
      source: this.config.id,
      data: weatherData.filter(d => d !== null),
      fetchedAt: new Date(),
      url: this.config.baseUrl
    };
  }

  /**
   * Parse weather data
   */
  protected async parse(externalData: ExternalData): Promise<any[]> {
    const weatherData = externalData.data;
    
    if (!Array.isArray(weatherData)) {
      console.warn(`[${this.config.id}] Invalid weather data format`);
      return [];
    }

    return weatherData.filter((data: any) => {
      return data.city && data.current;
    });
  }

  /**
   * Transform weather data to knowledge format
   */
  protected async transform(weatherItems: any[]): Promise<ConnectorKnowledge[]> {
    return weatherItems.map(item => {
      const current = item.current;
      const weatherDesc = this.getWeatherDescription(current.weather_code);

      const content = `
🌍 **Weather Update: ${item.city}**

🌡️ Temperature: ${current.temperature_2m}°C
💧 Humidity: ${current.relative_humidity_2m}%
💨 Wind Speed: ${current.wind_speed_10m} km/h
☁️ Conditions: ${weatherDesc}

📅 Time: ${current.time}
📍 Location: ${item.city}
🔍 Coordinates: ${item.latitude}°N, ${item.longitude}°E
      `.trim();

      // Calculate importance based on weather severity
      let importance = 50; // base importance for weather
      if (current.temperature_2m > 35 || current.temperature_2m < 0) importance += 20; // extreme temp
      if (current.wind_speed_10m > 50) importance += 15; // strong winds
      if (current.weather_code >= 80) importance += 10; // precipitation

      return {
        type: 'context',
        content,
        importance: Math.min(importance, 100),
        tags: [
          'source:external',
          'origin:openmeteo',
          'type:weather',
          `city:${item.city.toLowerCase()}`,
          `conditions:${weatherDesc.toLowerCase()}`,
          current.temperature_2m > 30 ? 'temp:hot' : current.temperature_2m < 10 ? 'temp:cold' : 'temp:moderate'
        ],
        metadata: {
          url: `https://open-meteo.com/en/docs`,
          source: 'Open-Meteo',
          fetched_at: new Date().toISOString(),
          city: item.city,
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          wind_speed: current.wind_speed_10m,
          weather_code: current.weather_code,
          conditions: weatherDesc,
          coordinates: {
            lat: item.latitude,
            lon: item.longitude
          }
        }
      };
    });
  }

  /**
   * Convert WMO weather code to description
   */
  private getWeatherDescription(code: number): string {
    const weatherCodes: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    return weatherCodes[code] || `Unknown (${code})`;
  }
}
