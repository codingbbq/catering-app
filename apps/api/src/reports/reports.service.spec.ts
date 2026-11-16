import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from './reports.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    prisma = {
      enquiry: {
        findMany: vi.fn(),
      },
      quotation: {
        findMany: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
      },
      invoice: {
        findMany: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      dailyMealOrder: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      dailyMealPlan: {
        count: vi.fn(),
      },
      inventoryItem: {
        findMany: vi.fn(),
      },
    };

    service = new ReportsService(prisma as any);
  });

  describe('getSalesSummary', () => {
    it('calculates enquiries and quotations metrics accurately', async () => {
      prisma.enquiry.findMany.mockResolvedValue([
        { id: 'e1', status: 'new' },
        { id: 'e2', status: 'qualified' },
        { id: 'e3', status: 'proposal_sent' },
        { id: 'e4', status: 'won' },
      ]);

      prisma.quotation.findMany.mockResolvedValue([
        {
          id: '00000000-0000-0000-0000-000000000010',
          quotationNumber: 'QT-202611-0001',
          title: 'Wedding Feast',
          status: 'accepted',
          createdAt: new Date('2026-11-01T10:00:00Z'),
          enquiry: { customer: { name: 'Alice Smith' } },
          revisions: [{ totalAmount: 5000 }],
        },
        {
          id: '00000000-0000-0000-0000-000000000011',
          quotationNumber: 'QT-202611-0002',
          title: 'Corporate Gala',
          status: 'sent',
          createdAt: new Date('2026-11-05T10:00:00Z'),
          enquiry: { customer: { name: 'Acme Corp' } },
          revisions: [{ totalAmount: 3000 }],
        },
      ]);

      const result = await service.getSalesSummary(tenantId, { period: '30d' });

      expect(prisma.enquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId }) }),
      );
      expect(prisma.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId }) }),
      );

      expect(result.enquiries.total).toBe(4);
      expect(result.enquiries.qualificationRate).toBe(75); // 3 of 4
      expect(result.enquiries.winRate).toBe(25); // 1 of 4

      expect(result.quotations.total).toBe(2);
      expect(result.quotations.totalQuotedValue).toBe(8000);
      expect(result.quotations.averageQuoteValue).toBe(4000);
      expect(result.quotations.acceptedCount).toBe(1);
      expect(result.quotations.acceptedValue).toBe(5000);
      expect(result.quotations.acceptanceRate).toBe(50);
      expect(result.topQuotations).toHaveLength(2);
      expect(result.topQuotations[0]?.quotationNumber).toBe('QT-202611-0001');
    });

    it('handles empty enquiries and quotations gracefully with zero metrics', async () => {
      prisma.enquiry.findMany.mockResolvedValue([]);
      prisma.quotation.findMany.mockResolvedValue([]);

      const result = await service.getSalesSummary(tenantId, { period: 'all_time' });

      expect(result.enquiries.total).toBe(0);
      expect(result.enquiries.qualificationRate).toBe(0);
      expect(result.enquiries.winRate).toBe(0);
      expect(result.quotations.total).toBe(0);
      expect(result.quotations.totalQuotedValue).toBe(0);
      expect(result.quotations.averageQuoteValue).toBe(0);
      expect(result.quotations.acceptanceRate).toBe(0);
      expect(result.topQuotations).toEqual([]);
    });
  });

  describe('getBookingSummary', () => {
    it('calculates booking operational metrics and revenue accurately', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      prisma.booking.findMany.mockResolvedValue([
        {
          id: '00000000-0000-0000-0000-000000000021',
          bookingNumber: 'BK-202611-0001',
          title: 'Summit Lunch',
          status: 'confirmed',
          eventDate: futureDate,
          guestCount: 50,
          totalAmount: 2500,
          customer: { name: 'Tech Solutions' },
        },
        {
          id: '00000000-0000-0000-0000-000000000022',
          bookingNumber: 'BK-202611-0002',
          title: 'Past Banquet',
          status: 'completed',
          eventDate: new Date('2026-10-01'),
          guestCount: 150,
          totalAmount: 7500,
          customer: { name: 'Global Finance' },
        },
      ]);

      const result = await service.getBookingSummary(tenantId, { period: 'this_year' });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId }) }),
      );

      expect(result.totalBookings).toBe(2);
      expect(result.totalConfirmedRevenue).toBe(10000);
      expect(result.averageBookingValue).toBe(5000);
      expect(result.totalGuests).toBe(200);
      expect(result.averageGuests).toBe(100);
      expect(result.upcomingCount).toBe(1);
      expect(result.completedCount).toBe(1);
      expect(result.recentBookings).toHaveLength(2);
    });
  });

  describe('getFinanceSummary', () => {
    it('computes invoiced, paid, outstanding and overdue balances correctly', async () => {
      const pastDueDate = new Date('2026-10-01');
      const futureDueDate = new Date('2026-12-31');

      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          status: 'issued',
          totalAmount: 1000,
          paidAmount: 0,
          balanceDue: 1000,
          dueDate: pastDueDate, // overdue
        },
        {
          id: 'inv-2',
          status: 'partially_paid',
          totalAmount: 2000,
          paidAmount: 500,
          balanceDue: 1500,
          dueDate: futureDueDate, // not overdue
        },
        {
          id: 'inv-3',
          status: 'paid',
          totalAmount: 3000,
          paidAmount: 3000,
          balanceDue: 0,
          dueDate: pastDueDate,
        },
        {
          id: 'inv-4',
          status: 'void',
          totalAmount: 5000,
          paidAmount: 0,
          balanceDue: 5000,
          dueDate: pastDueDate,
        },
      ]);

      prisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 500,
          unallocatedAmount: 100,
          paymentMethod: 'bank_transfer',
          status: 'allocated',
        },
        {
          id: 'pay-2',
          amount: 3000,
          unallocatedAmount: 0,
          paymentMethod: 'upi',
          status: 'allocated',
        },
      ]);

      const result = await service.getFinanceSummary(tenantId, { period: '30d' });

      // Void is ignored
      expect(result.totalInvoiced).toBe(6000); // 1000 + 2000 + 3000
      expect(result.totalPaid).toBe(3500); // 0 + 500 + 3000
      expect(result.totalOutstanding).toBe(2500); // 1000 + 1500 + 0
      expect(result.totalOverdue).toBe(1000); // only inv-1 is issued and past due
      expect(result.overdueCount).toBe(1);
      expect(result.collectionRate).toBe(58.33); // 3500 / 6000 * 100

      expect(result.totalPaymentsReceipts).toBe(3500);
      expect(result.unallocatedCredits).toBe(100);
      expect(result.paymentMethods.bank_transfer).toBe(500);
      expect(result.paymentMethods.upi).toBe(3000);
    });
  });

  describe('getOperationsSummary', () => {
    it('aggregates daily meal orders and inventory item valuation', async () => {
      prisma.dailyMealOrder.findMany.mockResolvedValue([
        {
          id: 'dmo-1',
          status: 'confirmed',
          serviceSlot: 'lunch',
          totalQuantity: 20,
          totalAmount: 300,
        },
        {
          id: 'dmo-2',
          status: 'delivered',
          serviceSlot: 'dinner',
          totalQuantity: 15,
          totalAmount: 250,
        },
      ]);
      prisma.dailyMealPlan.count.mockResolvedValue(3);

      prisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          category: 'meat_poultry',
          currentStock: 10,
          minStockLevel: 5,
          unitCost: 15, // in stock, val: 150
        },
        {
          id: 'item-2',
          category: 'produce',
          currentStock: 2,
          minStockLevel: 5,
          unitCost: 10, // low stock, val: 20
        },
        {
          id: 'item-3',
          category: 'produce',
          currentStock: 0,
          minStockLevel: 5,
          unitCost: 8, // out of stock, val: 0
        },
      ]);

      const result = await service.getOperationsSummary(tenantId, { period: '30d' });

      expect(result.mealOrders.totalOrders).toBe(2);
      expect(result.mealOrders.totalQuantity).toBe(35);
      expect(result.mealOrders.totalValue).toBe(550);
      expect(result.mealOrders.activePlansCount).toBe(3);

      expect(result.inventory.totalItems).toBe(3);
      expect(result.inventory.totalStockValuation).toBe(170); // 150 + 20 + 0
      expect(result.inventory.lowStockCount).toBe(1);
      expect(result.inventory.outOfStockCount).toBe(1);
      expect(result.inventory.byCategory).toHaveLength(2);
    });
  });

  describe('getDashboardOverview', () => {
    it('compiles dashboard KPI metrics and urgent operational alerts', async () => {
      const today = new Date();
      const past = new Date(today.getTime() - 86400000 * 5);
      const future = new Date(today.getTime() + 86400000 * 3);

      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'b1',
          totalAmount: 4000,
          eventDate: future,
          bookingNumber: 'BK-001',
          title: 'Future Wedding',
        },
      ]);

      prisma.quotation.findMany.mockResolvedValue([
        {
          id: 'q1',
          quotationNumber: 'QT-001',
          title: 'Corporate Conference',
          status: 'sent',
          validUntil: future,
          revisions: [{ totalAmount: 6000 }],
        },
      ]);

      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'i1',
          invoiceNumber: 'INV-001',
          status: 'issued',
          totalAmount: 2000,
          paidAmount: 0,
          balanceDue: 2000,
          dueDate: past, // overdue!
        },
      ]);

      prisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: 1500 },
      });

      prisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'it-1',
          sku: 'RICE-01',
          name: 'Basmati Rice',
          currentStock: 1,
          minStockLevel: 10,
        },
      ]);

      prisma.dailyMealOrder.count.mockResolvedValue(5);

      const result = await service.getDashboardOverview(tenantId);

      expect(result.kpi.activeBookingsValue).toBe(4000);
      expect(result.kpi.upcomingBookingsCount).toBe(1);
      expect(result.kpi.pipelineQuotedValue).toBe(6000);
      expect(result.kpi.pendingQuotesCount).toBe(1);
      expect(result.kpi.totalRevenueCollected).toBe(1500);
      expect(result.kpi.outstandingInvoiced).toBe(2000);
      expect(result.kpi.overdueInvoicesCount).toBe(1);
      expect(result.kpi.lowStockAlertsCount).toBe(1);
      expect(result.kpi.mealOrdersScheduledCount).toBe(5);

      expect(result.recentAlerts.length).toBeGreaterThanOrEqual(3);
      expect(result.recentAlerts.some((a) => a.type === 'invoice_overdue')).toBe(true);
      expect(result.recentAlerts.some((a) => a.type === 'booking_upcoming')).toBe(true);
      expect(result.recentAlerts.some((a) => a.type === 'stock_low')).toBe(true);
    });
  });
});
