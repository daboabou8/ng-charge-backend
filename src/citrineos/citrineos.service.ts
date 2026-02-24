import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CitrineosService {
  private readonly logger = new Logger(CitrineosService.name);
  private readonly apiUrl: string;
  private readonly tenantId: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get('CITRINEOS_API_URL');
    this.tenantId = this.configService.get('CITRINEOS_TENANT_ID') || '1';
  }

  // ==================== REMOTE START ====================

  async remoteStartTransaction(stationId: string, connectorId: number, idTag: string) {
    try {
      this.logger.log(`RemoteStart: ${stationId} - Connector ${connectorId}`);

      const payload = {
        idTag,
        connectorId,
      };

      const response = await axios.post(
        `${this.apiUrl}/data/charging-station/${stationId}/remote-start`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`RemoteStart response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`RemoteStart error: ${error.message}`);
      throw error;
    }
  }

  // ==================== REMOTE STOP ====================

  async remoteStopTransaction(stationId: string, transactionId: number) {
    try {
      this.logger.log(`RemoteStop: Transaction ${transactionId}`);

      const payload = {
        transactionId,
      };

      const response = await axios.post(
        `${this.apiUrl}/data/charging-station/${stationId}/remote-stop`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`RemoteStop response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`RemoteStop error: ${error.message}`);
      throw error;
    }
  }

  // ==================== GET STATION STATUS ====================

  async getStationStatus(stationId: string) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/data/charging-station/${stationId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`GetStationStatus error: ${error.message}`);
      throw error;
    }
  }

  // ==================== GET ALL STATIONS ====================

  async getAllStations() {
    try {
      const response = await axios.get(`${this.apiUrl}/data/charging-stations`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`GetAllStations error: ${error.message}`);
      return [];
    }
  }

  // ==================== SYNC STATIONS ====================

  async syncStations() {
    try {
      this.logger.log('Syncing stations from CitrineOS...');

      const citrineoStations = await this.getAllStations();

      this.logger.log(`Found ${citrineoStations.length} stations in CitrineOS`);

      return {
        success: true,
        count: citrineoStations.length,
        stations: citrineoStations,
      };
    } catch (error) {
      this.logger.error(`Sync error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== GET TRANSACTION ====================

  async getTransaction(transactionId: number) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/data/transaction/${transactionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`GetTransaction error: ${error.message}`);
      throw error;
    }
  }
}