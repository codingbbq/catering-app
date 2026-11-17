import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CommunicationProviderResult,
  MockCommunicationProvider,
  SendMessagePayload,
} from './communication-provider.js';
import { ResendEmailAdapter } from './resend-email.adapter.js';
import { TwilioMessagingAdapter } from './twilio-messaging.adapter.js';

@Injectable()
export class GatewayRouterService {
  private readonly logger = new Logger(GatewayRouterService.name);
  private readonly mockProvider = new MockCommunicationProvider();

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(payload: SendMessagePayload): Promise<CommunicationProviderResult> {
    const config = await this.prisma.platformCommunicationConfig.findUnique({
      where: { id: 'default' },
    });

    // If internal note, mock / local delivery
    if (payload.channel === 'internal_note') {
      return this.mockProvider.send(payload);
    }

    // If mock mode or no config, use mock
    if (!config || config.mode === 'mock') {
      return this.mockProvider.send(payload);
    }

    // LIVE MODE: Resend for Email
    if (payload.channel === 'email') {
      if (config.resendApiKey) {
        const resend = new ResendEmailAdapter({
          apiKey: config.resendApiKey,
          fromEmail: config.resendFromEmail || undefined,
          fromName: config.resendFromName || undefined,
        });
        return resend.send(payload);
      }
      this.logger.warn('Live mode enabled but Resend API Key is missing. Falling back to mock.');
      return this.mockProvider.send(payload);
    }

    // LIVE MODE: Twilio for SMS and WhatsApp
    if (payload.channel === 'sms' || payload.channel === 'whatsapp') {
      if (config.twilioAccountSid && config.twilioAuthToken) {
        const twilio = new TwilioMessagingAdapter({
          accountSid: config.twilioAccountSid,
          authToken: config.twilioAuthToken,
          phoneNumber: config.twilioPhoneNumber || undefined,
          whatsappNumber: config.twilioWhatsappNumber || undefined,
        });
        return twilio.send(payload);
      }
      this.logger.warn('Live mode enabled but Twilio credentials are missing. Falling back to mock.');
      return this.mockProvider.send(payload);
    }

    return this.mockProvider.send(payload);
  }

  async testConnection(gateway: 'resend' | 'twilio', testRecipient: string): Promise<{
    success: boolean;
    gateway: 'resend' | 'twilio';
    message: string;
    details?: Record<string, any> | undefined;
  }> {
    const config = await this.prisma.platformCommunicationConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return {
        success: false,
        gateway,
        message: 'Platform communication configuration not found.',
      };
    }

    if (gateway === 'resend') {
      if (!config.resendApiKey) {
        return {
          success: false,
          gateway,
          message: 'Resend API Key is not configured.',
        };
      }
      const resend = new ResendEmailAdapter({
        apiKey: config.resendApiKey,
        fromEmail: config.resendFromEmail || undefined,
        fromName: config.resendFromName || undefined,
      });

      const res = await resend.send({
        channel: 'email',
        recipient: testRecipient,
        subject: 'Catering SaaS Platform - Gateway Connectivity Test',
        content: 'This is a test notification confirming that your Resend gateway is active and operational.',
      });

      return {
        success: res.status !== 'failed',
        gateway,
        message: res.status !== 'failed'
          ? `Resend connectivity verified. Message ID: ${res.providerMessageId}`
          : `Resend test failed: ${res.errorMessage}`,
        details: res as any,
      };
    }

    if (gateway === 'twilio') {
      if (!config.twilioAccountSid || !config.twilioAuthToken) {
        return {
          success: false,
          gateway,
          message: 'Twilio Account SID or Auth Token is not configured.',
        };
      }

      const isWhatsApp = testRecipient.toLowerCase().includes('whatsapp') || testRecipient.startsWith('+');
      const channel = testRecipient.toLowerCase().includes('whatsapp') ? 'whatsapp' : 'sms';

      const twilio = new TwilioMessagingAdapter({
        accountSid: config.twilioAccountSid,
        authToken: config.twilioAuthToken,
        phoneNumber: config.twilioPhoneNumber || undefined,
        whatsappNumber: config.twilioWhatsappNumber || undefined,
      });

      const res = await twilio.send({
        channel,
        recipient: testRecipient.replace('whatsapp:', ''),
        content: 'Catering SaaS Platform: Twilio gateway connectivity test successful.',
      });

      return {
        success: res.status !== 'failed',
        gateway,
        message: res.status !== 'failed'
          ? `Twilio connectivity verified. Message SID: ${res.providerMessageId}`
          : `Twilio test failed: ${res.errorMessage}`,
        details: res as any,
      };
    }

    return {
      success: false,
      gateway,
      message: 'Unknown gateway provider.',
    };
  }
}
