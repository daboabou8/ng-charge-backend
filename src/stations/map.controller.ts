import { Controller, Get, Query } from '@nestjs/common';
import { StationsService } from './stations.service';

@Controller('map')
export class MapController {
  constructor(private stationsService: StationsService) {}

  // ==================== GEOJSON POUR LEAFLET ====================

  @Get('stations/geojson')
  async getStationsGeoJSON(
    @Query('latitude') lat?: string,
    @Query('longitude') lng?: string,
    @Query('radius') radius?: string,
    @Query('status') status?: string,
    @Query('connectorType') connectorType?: string,
  ) {
    // Récupérer toutes les stations avec filtres
    const result = await this.stationsService.findAll({
      latitude: lat ? Number(lat) : undefined,
      longitude: lng ? Number(lng) : undefined,
      radius: radius ? Number(radius) : undefined,
      status: status as any,
      connectorType: connectorType as any,
      page: 1,
      limit: 1000, // Max pour la carte
    });

    // Convertir en GeoJSON pour Leaflet
    const geoJSON = {
      type: 'FeatureCollection',
      features: result.data.map((station: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [station.longitude, station.latitude], // [lng, lat] pour Leaflet
        },
        properties: {
          id: station.id,
          stationId: station.stationId,
          name: station.name,
          code: station.code,
          address: station.address,
          city: station.city,
          status: station.status,
          power: station.power,
          connectorType: station.connectorType,
          numberOfPorts: station.numberOfPorts,
          pricePerKwh: station.pricePerKwh,
          photos: station.photos,
          amenities: station.amenities,
          description: station.description,
          averageRating: station.averageRating || 0,
          distance: station.distance, // Si recherche par distance
          isPublic: station.isPublic,
          // Icône selon le status
          markerColor: this.getMarkerColor(station.status),
          icon: this.getMarkerIcon(station.status),
        },
      })),
    };

    return geoJSON;
  }

  @Get('stations/clusters')
  async getStationsClusters(
    @Query('bounds') bounds?: string, // "minLat,minLng,maxLat,maxLng"
    @Query('zoom') zoom?: string,
  ) {
    // Pour clustering côté serveur (optionnel)
    // Leaflet peut faire le clustering côté client avec Leaflet.markercluster

    if (!bounds) {
      return this.getStationsGeoJSON();
    }

    const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);

    // Filtrer les stations dans les bounds
    const allStations = await this.stationsService.findAll({
      page: 1,
      limit: 1000,
    });

    const filteredStations = allStations.data.filter((station: any) => {
      return (
        station.latitude >= minLat &&
        station.latitude <= maxLat &&
        station.longitude >= minLng &&
        station.longitude <= maxLng
      );
    });

    // Convertir en GeoJSON
    const geoJSON = {
      type: 'FeatureCollection',
      features: filteredStations.map((station: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [station.longitude, station.latitude],
        },
        properties: {
          id: station.id,
          name: station.name,
          status: station.status,
          power: station.power,
          pricePerKwh: station.pricePerKwh,
          markerColor: this.getMarkerColor(station.status),
        },
      })),
    };

    return geoJSON;
  }

  @Get('stations/nearby')
  async getNearbyStations(
    @Query('latitude') lat: string,
    @Query('longitude') lng: string,
    @Query('radius') radius: string = '10', // km
    @Query('limit') limit: string = '20',
  ) {
    const result = await this.stationsService.findAll({
      latitude: Number(lat),
      longitude: Number(lng),
      radius: Number(radius),
      page: 1,
      limit: Number(limit),
    });

    return {
      location: {
        latitude: Number(lat),
        longitude: Number(lng),
      },
      radius: Number(radius),
      count: result.data.length,
      stations: result.data,
    };
  }

  // ==================== HELPER FUNCTIONS ====================

  private getMarkerColor(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'green';
      case 'OCCUPIED':
        return 'orange';
      case 'OUT_OF_SERVICE':
        return 'red';
      case 'MAINTENANCE':
        return 'yellow';
      case 'OFFLINE':
        return 'gray';
      default:
        return 'blue';
    }
  }

  private getMarkerIcon(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'charging-station';
      case 'OCCUPIED':
        return 'bolt';
      case 'OUT_OF_SERVICE':
        return 'times-circle';
      case 'MAINTENANCE':
        return 'wrench';
      case 'OFFLINE':
        return 'power-off';
      default:
        return 'map-marker';
    }
  }
}