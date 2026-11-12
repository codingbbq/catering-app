export interface CommunicationProviderResult {
  provider: string;
  providerMessageId: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

export interface SendMessagePayload {
  channel: 'email' | 'sms' | 'whatsapp' | 'internal_note';
  recipient: string;
  sender?: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface CommunicationProvider {
  name: string;
  send(payload: SendMessagePayload): Promise<CommunicationProviderResult>;
}

export class MockCommunicationProvider implements CommunicationProvider {
  readonly name = 'mock-provider';

  async send(payload: SendMessagePayload): Promise<CommunicationProviderResult> {
    const now = new Date();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const providerMessageId = `mock_${payload.channel}_${Date.now()}_${randomHex}`;

    // Test failure simulation: if recipient contains 'fail' or 'invalid', simulate delivery failure
    if (
      payload.recipient.toLowerCase().includes('fail') ||
      payload.recipient.toLowerCase().includes('invalid')
    ) {
      return {
        provider: this.name,
        providerMessageId,
        status: 'failed',
        sentAt: now,
        errorMessage: `Upstream gateway rejected delivery to ${payload.recipient}: Invalid contact destination.`,
      };
    }

    // For internal notes, direct delivery
    if (payload.channel === 'internal_note') {
      return {
        provider: this.name,
        providerMessageId,
        status: 'delivered',
        sentAt: now,
        deliveredAt: now,
      };
    }

    // SMS & WhatsApp are delivered instantly in mock mode, Email delivered
    return {
      provider: this.name,
      providerMessageId,
      status: 'delivered',
      sentAt: now,
      deliveredAt: new Date(now.getTime() + 1000),
    };
  }
}
