export class CinetpayWebhookDto {
  cpm_trans_id: string;
  cpm_site_id: string;
  cpm_amount: string;
  cpm_currency: string;
  signature: string;
  payment_method: string;
  cel_phone_num: string;
  cpm_phone_prefixe: string;
  cpm_language: string;
  cpm_version: string;
  cpm_payment_config: string;
  cpm_page_action: string;
  cpm_custom: string;
  cpm_designation: string;
  buyer_name: string;
  cpm_error_message?: string;
  cpm_payid?: string;
  cpm_payment_date?: string;
  cpm_payment_time?: string;
}