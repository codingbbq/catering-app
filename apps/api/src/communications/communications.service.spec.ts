import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationsService } from './communications.service.js';

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let mockPrisma: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockPrisma = {
      communicationLog: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      communicationTemplate: {
        findMany: vi.fn(),
        createMany: vi.fn(),
      },
      customer: {
        findFirst: vi.fn(),
      },
      enquiry: {
        findFirst: vi.fn(),
      },
      quotation: {
        findFirst: vi.fn(),
      },
      booking: {
        findFirst: vi.fn(),
      },
      enquiryActivity: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new CommunicationsService(mockPrisma);
  });

  describe('listCommunications', () => {
    it('should return paginated communication logs with stats', async () => {
      const mockLog = {
        id: '22222222-2222-2222-2222-222222222222',
        tenantId,
        customerId: '33333333-3333-3333-3333-333333333333',
        customer: { id: '33333333-3333-3333-3333-333333333333', name: 'Acme Corp', email: 'acme@test.com' },
        enquiryId: null,
        enquiry: null,
        quotationId: null,
        quotation: null,
        bookingId: null,
        booking: null,
        channel: 'email',
        direction: 'outbound',
        status: 'delivered',
        recipient: 'acme@test.com',
        sender: 'Sales',
        subject: 'Welcome',
        content: 'Welcome to our catering service',
        metadata: null,
        provider: 'mock',
        providerMessageId: 'mock_123',
        errorMessage: null,
        retryCount: 0,
        sentAt: new Date('2026-11-12T10:00:00Z'),
        deliveredAt: new Date('2026-11-12T10:01:00Z'),
        createdAt: new Date('2026-11-12T10:00:00Z'),
        updatedAt: new Date('2026-11-12T10:01:00Z'),
      };

      mockPrisma.communicationLog.findMany
        .mockResolvedValueOnce([mockLog]) // items
        .mockResolvedValueOnce([{ status: 'delivered', channel: 'email' }]); // stats query
      mockPrisma.communicationLog.count.mockResolvedValueOnce(1);

      const result = await service.listCommunications(tenantId, { channel: 'email', status: 'delivered' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].recipient).toBe('acme@test.com');
      expect(result.total).toBe(1);
      expect(result.stats.delivered).toBe(1);
      expect(mockPrisma.communicationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            channel: 'email',
            status: 'delivered',
          }),
        }),
      );
    });
  });

  describe('getCommunicationById', () => {
    it('should return communication item when found', async () => {
      const mockLog = {
        id: '22222222-2222-2222-2222-222222222222',
        tenantId,
        channel: 'sms',
        direction: 'outbound',
        status: 'sent',
        recipient: '+1234567890',
        content: 'Your tasting menu is confirmed.',
        retryCount: 0,
        createdAt: new Date('2026-11-12T10:00:00Z'),
        updatedAt: new Date('2026-11-12T10:00:00Z'),
      };

      mockPrisma.communicationLog.findFirst.mockResolvedValueOnce(mockLog);

      const result = await service.getCommunicationById(tenantId, '22222222-2222-2222-2222-222222222222');
      expect(result.id).toBe('22222222-2222-2222-2222-222222222222');
      expect(result.channel).toBe('sms');
    });

    it('should throw NotFoundException when communication does not exist', async () => {
      mockPrisma.communicationLog.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCommunicationById(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCommunication', () => {
    it('should create and dispatch communication via provider', async () => {
      const createdLog = {
        id: '22222222-2222-2222-2222-222222222222',
        tenantId,
        channel: 'email',
        direction: 'outbound',
        status: 'delivered',
        recipient: 'client@example.com',
        subject: 'Tasting Invite',
        content: 'We invite you for a tasting session.',
        provider: 'mock-provider',
        providerMessageId: 'mock_email_123',
        retryCount: 0,
        sentAt: new Date('2026-11-12T10:00:00Z'),
        deliveredAt: new Date('2026-11-12T10:00:01Z'),
        createdAt: new Date('2026-11-12T10:00:00Z'),
        updatedAt: new Date('2026-11-12T10:00:01Z'),
      };

      mockPrisma.communicationLog.create.mockResolvedValueOnce(createdLog);

      const result = await service.createCommunication(tenantId, userId, {
        channel: 'email',
        recipient: 'client@example.com',
        subject: 'Tasting Invite',
        content: 'We invite you for a tasting session.',
      });

      expect(result.recipient).toBe('client@example.com');
      expect(mockPrisma.communicationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            channel: 'email',
            recipient: 'client@example.com',
            status: 'delivered',
          }),
        }),
      );
    });

    it('should mark message as draft without provider dispatch if isDraft is true', async () => {
      const createdDraft = {
        id: '33333333-3333-3333-3333-333333333333',
        tenantId,
        channel: 'whatsapp',
        direction: 'outbound',
        status: 'draft',
        recipient: '+1987654321',
        content: 'Draft proposal note',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.communicationLog.create.mockResolvedValueOnce(createdDraft);

      const result = await service.createCommunication(tenantId, userId, {
        channel: 'whatsapp',
        recipient: '+1987654321',
        content: 'Draft proposal note',
        isDraft: true,
      });

      expect(result.status).toBe('draft');
      expect(mockPrisma.communicationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
          }),
        }),
      );
    });

    it('should validate linked customer belonging to tenant', async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createCommunication(tenantId, userId, {
          channel: 'email',
          recipient: 'test@example.com',
          content: 'Hello',
          customerId: '44444444-4444-4444-4444-444444444444',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('retryCommunication', () => {
    it('should re-dispatch failed communication and increment retryCount', async () => {
      const existingFailed = {
        id: '55555555-5555-5555-5555-555555555555',
        tenantId,
        channel: 'email',
        recipient: 'valid@example.com',
        content: 'Important update',
        status: 'failed',
        retryCount: 1,
      };

      const updatedSuccess = {
        ...existingFailed,
        status: 'delivered',
        retryCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.communicationLog.findFirst.mockResolvedValueOnce(existingFailed);
      mockPrisma.communicationLog.update.mockResolvedValueOnce(updatedSuccess);

      const result = await service.retryCommunication(tenantId, userId, existingFailed.id);
      expect(result.status).toBe('delivered');
      expect(mockPrisma.communicationLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingFailed.id },
          data: expect.objectContaining({
            retryCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should reject retrying an already delivered message', async () => {
      mockPrisma.communicationLog.findFirst.mockResolvedValueOnce({
        id: '66666666-6666-6666-6666-666666666666',
        tenantId,
        status: 'delivered',
      });

      await expect(
        service.retryCommunication(tenantId, userId, '66666666-6666-6666-6666-666666666666'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTemplates', () => {
    it('should seed and return default templates when none exist', async () => {
      mockPrisma.communicationTemplate.findMany
        .mockResolvedValueOnce([]) // First check empty
        .mockResolvedValueOnce([
          {
            id: '77777777-7777-7777-7777-777777777777',
            tenantId,
            name: 'Quotation Shared Notice',
            channel: 'email',
            category: 'quotation',
            subject: 'Subject',
            body: 'Body',
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

      mockPrisma.communicationTemplate.createMany.mockResolvedValueOnce({ count: 5 });

      const templates = await service.getTemplates(tenantId);
      expect(templates).toHaveLength(1);
      expect(mockPrisma.communicationTemplate.createMany).toHaveBeenCalled();
    });
  });
});
