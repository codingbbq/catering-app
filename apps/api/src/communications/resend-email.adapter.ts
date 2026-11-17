import type { CommunicationProviderResult, SendMessagePayload } from './communication-provider.js';

export interface ResendConfig {
  apiKey: string;
  fromEmail?: string | undefined;
  fromName?: string | undefined;
}

export class ResendEmailAdapter {
  constructor(private readonly config: ResendConfig) {}

  async send(payload: SendMessagePayload): Promise<CommunicationProviderResult> {
    const fromAddress = this.config.fromName
      ? `${this.config.fromName} <${this.config.fromEmail || 'onboarding@resend.dev'}>`
      : this.config.fromEmail || 'onboarding@resend.dev';

    const now = new Date();

    try {
      const response: any = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [payload.recipient],
          subject: payload.subject || 'Catering Notification',
          text: payload.content,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        return {
          provider: 'resend',
          providerMessageId: `err_${Date.now()}`,
          status: 'failed',
          sentAt: now,
          errorMessage: data.message || `Resend HTTP error ${response.status}`,
        };
      }

      return {
        provider: 'resend',
        providerMessageId: data.id || `resend_${Date.now()}`,
        status: 'delivered',
        sentAt: now,
        deliveredAt: new Date(),
      };
    } catch (err: any) {
      return {
        provider: 'resend',
        providerMessageId: `err_${Date.now()}`,
        status: 'failed',
        sentAt: now,
        errorMessage: err.message || 'Network error connecting to Resend API',
      };
    }
  }
}
