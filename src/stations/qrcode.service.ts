import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class QrCodeService {
  // Générer un QR code unique
  generateQrCodeData(stationCode: string, stationId: string): string {
    // Format: QR-{CODE}-{YEAR}-{HASH}
    const year = new Date().getFullYear();
    const hash = crypto
      .createHash('md5')
      .update(`${stationCode}-${stationId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();

    return `QR-${stationCode}-${year}-${hash}`;
  }

  // Générer l'image QR code en Base64
  async generateQrCodeImage(qrCodeData: string): Promise<string> {
    try {
      // Données JSON complètes dans le QR code
      const qrContent = JSON.stringify({
        type: 'EV_CHARGING_STATION',
        qrCode: qrCodeData,
        app: 'evcharge.gn',
        version: '1.0',
        timestamp: new Date().toISOString(),
      });

      // Générer l'image en Base64
      const qrCodeImage = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCodeImage;
    } catch (error) {
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  // Générer l'image QR code en Buffer (pour téléchargement)
  async generateQrCodeBuffer(qrCodeData: string): Promise<Buffer> {
    try {
      const qrContent = JSON.stringify({
        type: 'EV_CHARGING_STATION',
        qrCode: qrCodeData,
        app: 'evcharge.gn',
        version: '1.0',
        timestamp: new Date().toISOString(),
      });

      const buffer = await QRCode.toBuffer(qrContent, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 1024,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return buffer;
    } catch (error) {
      throw new Error(`QR code buffer generation failed: ${error.message}`);
    }
  }

  // Générer QR code avec logo (optionnel)
  async generateQrCodeWithLogo(
    qrCodeData: string,
    logoBase64?: string,
  ): Promise<string> {
    // Pour l'instant, sans logo
    // On peut ajouter la fusion avec un logo plus tard
    return this.generateQrCodeImage(qrCodeData);
  }

  // Valider un QR code
  validateQrCode(qrCodeData: string): boolean {
    // Format attendu: QR-XXX-YYYY-HASH
    const regex = /^QR-[A-Z0-9]+-\d{4}-[A-Z0-9]{6}$/;
    return regex.test(qrCodeData);
  }

  // Décoder le contenu du QR code
  parseQrCode(qrCodeContent: string): any {
    try {
      const parsed = JSON.parse(qrCodeContent);
      if (parsed.type === 'EV_CHARGING_STATION') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}