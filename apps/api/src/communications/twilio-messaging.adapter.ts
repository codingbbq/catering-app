import type { CommunicationProviderResult, SendMessagePayload } from './communication-provider.js';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber?: string | undefined;
  whatsappNumber?: string | undefined;
}

export class TwilioMessagingAdapter {
  constructor(private readonly config: TwilioConfig) {}

  async send(payload: SendMessagePayload): Promise<CommunicationProviderResult> {
    const isWhatsApp = payload.channel === 'whatsapp';
    const now = new Date();

    const from = isWhatsApp
      ? this.config.whatsappNumber || 'whatsapp:+14155238886'
      : this.config.phoneNumber;

    if (!from) {
      return {
        provider: 'twilio',
        providerMessageId: `err_${Date.now()}`,
        status: 'failed',
        sentAt: now,
        errorMessage: `Missing Twilio sender ${isWhatsApp ? 'WhatsApp number' : 'phone number'}.`,
      };
    }

    // Format destination for WhatsApp if channel is whatsapp
    let to = payload.recipient.trim();
    if (isWhatsApp && !to.startsWith('whatsapp:')) {
      to = `whatsapp:${to}`;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
      const basicAuth = Buffer.from(
        `${this.config.accountSid}:${this.config.authToken}`,
      ).toString('base64');

      const formData = new URLSearchParams();
      formData.append('From', from);
      formData.append('To', to);
      formData.append('Body', payload.content);

      const response: any = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        return {
          provider: 'twilio',
          providerMessageId: data.sid || `err_${Date.now()}`,
          status: 'failed',
          sentAt: now,
          errorMessage: data.message || `Twilio error ${data.code || response.status}`,
        };
      }

      const status =
        data.status === 'delivered'
          ? 'delivered'
          : data.status === 'failed' || data.status === 'undelivered'
          ? 'failed'
          : 'sent';

      return {
        provider: 'twilio',
        providerMessageId: data.sid,
        status,
        sentAt: now,
        deliveredAt: status === 'delivered' ? new Date() : undefined,
      };
    } catch (err: any) {
      return {
        provider: 'twilio',
        providerMessageId: `err_${Date.now()}`,
        status: 'failed',
        sentAt: now,
        errorMessage: err.message || 'Network error connecting to Twilio API',
      };
    }
  }
}
