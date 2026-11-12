import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { QuotationsService } from './quotations.service.js';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prisma: Partial<PrismaService>;
  let auditLogService: Partial<AuditLogService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const otherTenantId = '00000000-0000-0000-0000-000000000002';
  const userId = '11111111-1111-1111-1111-111111111111';
  const enquiryId = '22222222-2222-2222-2222-222222222222';
  const quotationId = '33333333-3333-3333-3333-333333333333';
  const revisionId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    prisma = {
      quotation: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      } as unknown as PrismaService['quotation'],
      quotationRevision: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      } as unknown as PrismaService['quotationRevision'],
      quotationLineItem: {
        deleteMany: vi.fn(),
      } as unknown as PrismaService['quotationLineItem'],
      enquiry: {
        findFirst: vi.fn(),
        update: vi.fn(),
      } as unknown as PrismaService['enquiry'],
      enquiryActivity: {
        create: vi.fn(),
      } as unknown as PrismaService['enquiryActivity'],
      tenantSettings: {
        findUnique: vi.fn().mockResolvedValue({ currencyCode: 'USD' }),
      } as unknown as PrismaService['tenantSettings'],
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new QuotationsService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('createQuotation', () => {
    it('creates a quotation with sequential number, initial revision, and deterministic totals', async () => {
      (prisma.enquiry!.findFirst as any).mockResolvedValue({
        id: enquiryId,
        tenantId,
        status: 'new',
        customer: { id: 'cust-1', name: 'Acme Corp', email: 'acme@test.com' },
      });

      (prisma.quotation!.count as any).mockResolvedValue(0);

      const createdQuotation = {
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        title: 'Annual Gala Dinner',
        status: 'draft',
        currentRevisionNumber: 1,
        validUntil: new Date('2026-12-31'),
        notes: 'Deposit required',
        terms: 'Net 30',
        createdAt: new Date(),
        updatedAt: new Date(),
        enquiry: {
          id: enquiryId,
          title: 'Gala Lead',
          customer: { id: 'cust-1', name: 'Acme Corp', email: 'acme@test.com', phone: '123' },
        },
        revisions: [
          {
            id: revisionId,
            quotationId,
            revisionNumber: 1,
            status: 'draft',
            menuId: null,
            costSheetId: null,
            guestCount: 100,
            pricePerPerson: 52.5,
            subtotal: 5000,
            taxPercent: 5,
            taxAmount: 250,
            discountAmount: 0,
            totalAmount: 5250,
            estimatedCost: 3000,
            estimatedMarginPercent: 40,
            notes: 'Initial proposal',
            changeSummary: 'Initial quotation prepared',
            createdByUserId: userId,
            items: [
              {
                id: 'item-1',
                revisionId,
                name: '3-Course Banquet Menu',
                description: 'Full course dinner',
                category: 'Food & Beverage',
                quantity: 100,
                unit: 'guest',
                unitPrice: 50,
                totalPrice: 5000,
                unitCost: 30,
                totalCost: 3000,
                sortOrder: 0,
              },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      (prisma.quotation!.create as any).mockResolvedValue(createdQuotation);
      (prisma.enquiry!.update as any).mockResolvedValue({});
      (prisma.enquiryActivity!.create as any).mockResolvedValue({});

      const result = await service.createQuotation(tenantId, userId, {
        enquiryId,
        title: 'Annual Gala Dinner',
        guestCount: 100,
        taxPercent: 5,
        items: [
          {
            name: '3-Course Banquet Menu',
            quantity: 100,
            unitPrice: 50,
            unitCost: 30,
          },
        ],
      });

      expect(result.quotationNumber).toBe('QT-202611-0001');
      expect(result.currentRevisionNumber).toBe(1);
      expect(result.currentRevision?.totalAmount).toBe(5250);
      expect(prisma.enquiry!.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'qualified' } }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'quotation.created' }),
      );
    });
  });

  describe('tenant isolation', () => {
    it('throws NotFoundException when fetching a quotation from a different tenant', async () => {
      (prisma.quotation!.findFirst as any).mockResolvedValue(null);

      await expect(
        service.getQuotationById(otherTenantId, quotationId),
      ).rejects.toThrow('not found');

      expect(prisma.quotation!.findFirst).toHaveBeenCalledWith({
        where: { id: quotationId, tenantId: otherTenantId },
        include: expect.any(Object),
      });
    });
  });

  describe('createRevision', () => {
    it('preserves historical integrity by creating revision 2 and superseding previous drafts', async () => {
      (prisma.quotation!.findFirst as any).mockResolvedValue({
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        title: 'Annual Gala Dinner',
        status: 'draft',
        currentRevisionNumber: 1,
        revisions: [
          { id: revisionId, revisionNumber: 1, status: 'draft' },
        ],
      });

      (prisma.quotationRevision!.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.quotationRevision!.create as any).mockResolvedValue({ id: 'rev-2' });
      (prisma.quotation!.update as any).mockResolvedValue({});
      (prisma.enquiryActivity!.create as any).mockResolvedValue({});

      // Mock getQuotationById response
      vi.spyOn(service, 'getQuotationById').mockResolvedValue({
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        title: 'Annual Gala Dinner',
        status: 'draft',
        currentRevisionNumber: 2,
        revisions: [
          {
            id: 'rev-2',
            quotationId,
            revisionNumber: 2,
            status: 'draft',
            totalAmount: 6300,
            subtotal: 6000,
            taxPercent: 5,
            taxAmount: 300,
            discountAmount: 0,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: revisionId,
            quotationId,
            revisionNumber: 1,
            status: 'superseded',
            totalAmount: 5250,
            subtotal: 5000,
            taxPercent: 5,
            taxAmount: 250,
            discountAmount: 0,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.createRevision(tenantId, userId, quotationId, {
        changeSummary: 'Increased guest count to 120',
        guestCount: 120,
        taxPercent: 5,
        items: [
          {
            name: '3-Course Banquet Menu',
            quantity: 120,
            unitPrice: 50,
          },
        ],
      });

      expect(prisma.quotationRevision!.updateMany).toHaveBeenCalledWith({
        where: { quotationId, status: 'draft' },
        data: { status: 'superseded' },
      });
      expect(prisma.quotation!.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentRevisionNumber: 2 }),
        }),
      );
      expect(result.currentRevisionNumber).toBe(2);
    });

    it('rejects creating a revision if quotation is already accepted', async () => {
      (prisma.quotation!.findFirst as any).mockResolvedValue({
        id: quotationId,
        tenantId,
        status: 'accepted',
        revisions: [],
      });

      await expect(
        service.createRevision(tenantId, userId, quotationId, {
          changeSummary: 'Should fail',
          items: [{ name: 'Test', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow('Cannot create a revision for an already accepted quotation');
    });
  });

  describe('updateDraftRevision immutability check', () => {
    it('rejects editing a revision if it is already sent', async () => {
      (prisma.quotation!.findFirst as any).mockResolvedValue({
        id: quotationId,
        tenantId,
      });

      (prisma.quotationRevision!.findFirst as any).mockResolvedValue({
        id: revisionId,
        quotationId,
        status: 'sent',
      });

      await expect(
        service.updateDraftRevision(tenantId, userId, quotationId, revisionId, {
          items: [{ name: 'Test', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow("Cannot edit revision in 'sent' status");
    });
  });

  describe('status transitions: send and accept', () => {
    it('marks quotation and revision as sent, and updates enquiry status', async () => {
      (prisma.quotation!.findFirst as any).mockResolvedValue({
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        status: 'draft',
        currentRevisionNumber: 1,
        enquiry: {
          id: enquiryId,
          status: 'qualified',
          customer: { id: 'cust-1', email: 'client@example.com' },
        },
        revisions: [{ id: revisionId, revisionNumber: 1, totalAmount: 5000 }],
      });

      vi.spyOn(service, 'getQuotationById').mockResolvedValue({
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        title: 'Annual Gala',
        status: 'sent',
        currentRevisionNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.sendQuotation(tenantId, userId, quotationId);

      expect(prisma.quotationRevision!.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'sent' } }),
      );
      expect(prisma.quotation!.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'sent' }) }),
      );
      expect(prisma.enquiry!.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'proposal_sent' } }),
      );
      expect(result.status).toBe('sent');
    });

    it('marks quotation as accepted and converts enquiry to converted for booking', async () => {
      (prisma.quotation!.findFirst as any).mockResolvedValue({
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        status: 'sent',
        currentRevisionNumber: 1,
        revisions: [{ id: revisionId, revisionNumber: 1, totalAmount: 5000 }],
      });

      vi.spyOn(service, 'getQuotationById').mockResolvedValue({
        id: quotationId,
        tenantId,
        enquiryId,
        quotationNumber: 'QT-202611-0001',
        title: 'Annual Gala',
        status: 'accepted',
        currentRevisionNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.acceptQuotation(tenantId, userId, quotationId);

      expect(prisma.quotationRevision!.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'accepted' } }),
      );
      expect(prisma.enquiry!.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'converted' }),
        }),
      );
      expect(result.status).toBe('accepted');
    });
  });
});
