import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class QrCodeService {
  private readonly uploadsPath = join(process.cwd(), 'uploads', 'qr');

  constructor() {
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsPath, { recursive: true });
      console.log('✅ Dossier uploads/qr vérifié');
    } catch (error) {
      console.error('❌ Erreur création dossier uploads/qr:', error);
    }
  }


/**
 * Génère l'URL pour le QR Code
 * Pointe vers la page web intelligente qui redirige vers l'app
 */
generateQrCodeData(code: string, stationId: string): string {
  const scanUrl = `https://ngcharge-guinee.netlify.app/?code=${code}`;
  return scanUrl;
}

  async generateAndSaveQrCode(code: string, stationId: string): Promise<string> {
    const qrData = this.generateQrCodeData(code, stationId);
    const filename = `qr-${code}.png`;
    const filepath = join(this.uploadsPath, filename);

    try {
      try {
        await fs.unlink(filepath);
        console.log(`🗑️  Ancien QR Code supprimé: ${filename}`);
      } catch (error) {
        // OK
      }

      await QRCode.toFile(filepath, qrData, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H',
        type: 'png',
      });

      console.log(`✅ QR Code généré: ${filename}`);
      return `/uploads/qr/${filename}`;
    } catch (error) {
      console.error('❌ Erreur génération QR Code:', error);
      throw new Error('Impossible de générer le QR Code');
    }
  }

  async regenerateQrCode(code: string, stationId: string): Promise<string> {
    return this.generateAndSaveQrCode(code, stationId);
  }

  async deleteQrCode(code: string): Promise<void> {
    const filename = `qr-${code}.png`;
    const filepath = join(this.uploadsPath, filename);

    try {
      await fs.unlink(filepath);
      console.log(`🗑️  QR Code supprimé: ${filename}`);
    } catch (error) {
      console.log(`ℹ️  QR Code déjà supprimé: ${filename}`);
    }
  }

  getQrCodePath(code: string): string {
    return join(this.uploadsPath, `qr-${code}.png`);
  }

  async qrCodeExists(code: string): Promise<boolean> {
    const filepath = this.getQrCodePath(code);
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🔒 Lit le fichier QR Code et le retourne en base64
   * Si le fichier n'existe pas, il est généré automatiquement
   */
  async getQrCodeAsBase64(code: string, stationId?: string): Promise<string> {
    const filepath = this.getQrCodePath(code);
    
    try {
      // Essayer de lire le fichier
      const fileBuffer = await fs.readFile(filepath);
      const base64 = fileBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error: any) {
      // Si le fichier n'existe pas, le générer automatiquement
      if (error.code === 'ENOENT' && stationId) {
        console.log(`⚠️  QR Code manquant pour ${code}, génération automatique...`);
        
        try {
          // Générer le QR Code
          await this.generateAndSaveQrCode(code, stationId);
          
          // Relire le fichier généré
          const fileBuffer = await fs.readFile(filepath);
          const base64 = fileBuffer.toString('base64');
          return `data:image/png;base64,${base64}`;
        } catch (genError) {
          console.error('❌ Erreur génération auto QR Code:', genError);
          throw new Error('Impossible de générer le QR Code automatiquement');
        }
      }
      
      console.error('❌ Erreur lecture QR Code:', error);
      throw new Error('QR Code introuvable');
    }
  }

  // Anciennes méthodes pour compatibilité
  async generateQrCodeBuffer(qrData: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(qrData, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H',
        type: 'png',
      });
      return buffer;
    } catch (error) {
      console.error('❌ Erreur génération buffer:', error);
      throw new Error('Impossible de générer le QR Code');
    }
  }

  async generateQrCodeImage(qrData: string): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      return dataUrl;
    } catch (error) {
      console.error('❌ Erreur génération image:', error);
      throw new Error('Impossible de générer le QR Code');
    }
  }
}