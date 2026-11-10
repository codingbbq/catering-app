import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service.js';

describe('EnquiriesService', () => {
  let service: EnquiriesService;
  let mockPrisma: any;
  let mockAuditLog: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const customerId = '22222222-2222-2222-2222-222222222222';
  const enquiryId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockPrisma = {
      enquiry: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      customer: {
        findFirst: vi.fn(),
      },
      tenantUser: {
        findFirst: vi.fn(),
      },
      enquiryActivity: {
        create: vi.fn(),
      },
    };

    mockAuditLog = {
      record: vi.fn().mockReturnValue(undefined),
    };

    service = new EnquiriesService(mockPrisma, mockAuditLog);
  });

  describe('listEnquiries', () => {
    it('scopes queries strictly to tenantId', async () => {
      mockPrisma.enquiry.findMany.mockResolvedValue([]);
      mockPrisma.enquiry.count.mockResolvedValue(0);

      const res = await service.listEnquiries(tenantId, { status: 'new' });

      expect(mockPrisma.enquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, status: 'new' }),
        }),
      );
      expect(res.data).toEqual([]);
      expect(res.total).toBe(0);
    });
  });

  describe('createEnquiry', () => {
    it('throws NotFoundException if customer does not exist in tenant', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.createEnquiry(tenantId, {
          customerId,
          title: 'Annual Gala',
          serviceType: 'event_catering',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates enquiry with initial status_change activity when customer exists', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: customerId, tenantId, name: 'Acme Corp' });
      mockPrisma.enquiry.create.mockResolvedValue({
        id: enquiryId,
        tenantId,
        customerId,
        title: 'Annual Gala',
        serviceType: 'event_catering',
        status: 'new',
        eventDate: new Date('2026-12-01'),
        guestCount: 150,
        eventType: 'Gala',
        venue: 'Grand Hall',
        estimatedBudget: null,
        notes: null,
        nextAction: null,
        nextActionDate: null,
        lostReason: null,
        assignedToId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { id: customerId, name: 'Acme Corp', email: null, phone: null },
        assignedTo: null,
        activities: [
          {
            id: 'act-1',
            enquiryId,
            type: 'status_change',
            content: 'Enquiry created with status: New',
            authorId: null,
            authorName: null,
            createdAt: new Date(),
          },
        ],
      });

      const res = await service.createEnquiry(tenantId, {
        customerId,
        title: 'Annual Gala',
        serviceType: 'event_catering',
        guestCount: 150,
      });

      expect(res.id).toBe(enquiryId);
      expect(res.status).toBe('new');
      expect(res.activities).toHaveLength(1);
      expect(mockAuditLog.record).toHaveBeenCalled();
    });
  });

  describe('qualifyEnquiry', () => {
    it('transitions new enquiry to qualified', async () => {
      mockPrisma.enquiry.findFirst.mockResolvedValue({
        id: enquiryId,
        tenantId,
        status: 'new',
      });

      mockPrisma.enquiry.update.mockResolvedValue({
        id: enquiryId,
        customerId,
        title: 'Corporate Lunch',
        status: 'qualified',
        serviceType: 'event_catering',
        eventDate: null,
        guestCount: null,
        eventType: null,
        venue: null,
        estimatedBudget: null,
        notes: null,
        nextAction: null,
        nextActionDate: null,
        lostReason: null,
        assignedToId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { id: customerId, name: 'Globex', email: null, phone: null },
        assignedTo: null,
        activities: [],
      });

      const res = await service.qualifyEnquiry(tenantId, enquiryId);
      expect(res.status).toBe('qualified');
      expect(mockPrisma.enquiry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: enquiryId },
          data: expect.objectContaining({ status: 'qualified' }),
        }),
      );
    });

    it('rejects qualification if enquiry is lost or cancelled', async () => {
      mockPrisma.enquiry.findFirst.mockResolvedValue({
        id: enquiryId,
        tenantId,
        status: 'lost',
      });

      await expect(service.qualifyEnquiry(tenantId, enquiryId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addActivity', () => {
    it('creates a note activity against an enquiry', async () => {
      mockPrisma.enquiry.findFirst.mockResolvedValue({ id: enquiryId, tenantId });
      mockPrisma.enquiryActivity.create.mockResolvedValue({
        id: 'act-2',
        enquiryId,
        type: 'call',
        content: 'Client requested vegetarian options for 20 pax',
        authorId: 'user-1',
        authorName: 'Sales Agent',
        createdAt: new Date(),
      });

      const res = await service.addActivity(tenantId, enquiryId, {
        type: 'call',
        content: 'Client requested vegetarian options for 20 pax',
      });

      expect(res.id).toBe('act-2');
      expect(res.type).toBe('call');
    });
  });
});
