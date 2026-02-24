import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class CinetpayService {
  private readonly logger = new Logger(CinetpayService.name);
  private readonly apiUrl = 'https://api-checkout.cinetpay.com/v2';
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly secretKey: string;
  private readonly notifyUrl: string;
  private readonly returnUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('CINETPAY_API_KEY');
    this.siteId = this.configService.get('CINETPAY_SITE_ID');
    this.secretKey = this.configService.get('CINETPAY_SECRET_KEY');
    this.notifyUrl = this.configService.get('CINETPAY_NOTIFY_URL');
    this.returnUrl = this.configService.get('FRONTEND_URL') + '/payment/callback';
  }

  async initiatePayment(
    amount: number,
    userId: string,
    description: string,
    metadata?: any,
  ) {
    try {
      const transactionId = this.generateTransactionId();

      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: transactionId,
        amount: amount,
        currency: 'GNF',
        description: description,
        customer_id: userId,
        customer_name: metadata?.customerName || 'Client',
        customer_surname: metadata?.customerSurname || 'EV Charge',
        customer_email: metadata?.customerEmail || '',
        customer_phone_number: metadata?.customerPhone || '',
        customer_city: metadata?.customerCity || 'Conakry',
        customer_country: 'GN',
        customer_state: 'GN',
        customer_zip_code: '',
        notify_url: this.notifyUrl,
        return_url: this.returnUrl,
        channels: 'ALL', // ALL, MOBILE_MONEY, CARD
        metadata: JSON.stringify(metadata || {}),
        lang: 'fr',
      };

      this.logger.log(`Initiating Cinetpay payment: ${transactionId}`);

      const response = await axios.post(`${this.apiUrl}/payment`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.code === '201') {
        return {
          success: true,
          transactionId,
          paymentUrl: response.data.data.payment_url,
          paymentToken: response.data.data.payment_token,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      this.logger.error('Cinetpay payment error:', error.message);
      throw new BadRequestException('Failed to initiate payment');
    }
  }

  async checkPaymentStatus(transactionId: string) {
    try {
      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: transactionId,
      };

      const response = await axios.post(`${this.apiUrl}/payment/check`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.code === '00') {
        return {
          success: true,
          status: response.data.data.payment_status,
          amount: response.data.data.amount,
          method: response.data.data.payment_method,
          date: response.data.data.payment_date,
        };
      } else {
        return {
          success: false,
          status: 'FAILED',
          message: response.data.message,
        };
      }
    } catch (error) {
      this.logger.error('Cinetpay check status error:', error.message);
      return {
        success: false,
        status: 'ERROR',
      };
    }
  }

  verifySignature(data: any, signature: string): boolean {
    try {
      // Construire la chaîne à hasher
      const stringToHash = `${data.cpm_site_id}${data.cpm_trans_id}${data.cpm_amount}${data.cpm_currency}${this.secretKey}`;

      // Calculer le hash
      const calculatedSignature = crypto
        .createHash('sha256')
        .update(stringToHash)
        .digest('hex');

      return calculatedSignature === signature;
    } catch (error) {
      this.logger.error('Signature verification error:', error.message);
      return false;
    }
  }

  private generateTransactionId(): string {
    return `EVCHARGE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  }
}