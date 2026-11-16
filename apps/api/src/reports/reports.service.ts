import type {
  BookingSummaryReport,
  DashboardOverviewReport,
  FinanceSummaryReport,
  OperationsSummaryReport,
  ReportFilterQuery,
  SalesSummaryReport,
} from '@catering/shared-types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

function parsePeriodBounds(query: ReportFilterQuery): {
  startDate: Date | null;
  endDate: Date | null;
  periodLabel: string;
} {
  const period = query.period ?? '30d';
  const now = new Date();

  if (period === 'custom' && (query.startDate || query.endDate)) {
    return {
      startDate: query.startDate ? new Date(query.startDate) : null,
      endDate: query.endDate ? new Date(query.endDate) : null,
      periodLabel: 'custom',
    };
  }

  if (period === 'all_time') {
    return {
      startDate: null,
      endDate: null,
      periodLabel: 'all_time',
    };
  }

  if (period === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: now, periodLabel: '7d' };
  }

  if (period === '90d') {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: now, periodLabel: '90d' };
  }

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start, endDate: now, periodLabel: 'this_month' };
  }

  if (period === 'this_quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterMonth, 1);
    return { startDate: start, endDate: now, periodLabel: 'this_quarter' };
  }

  if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { startDate: start, endDate: now, periodLabel: 'this_year' };
  }

  // Default: 30d
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate: start, endDate: now, periodLabel: '30d' };
}

function buildDateFilter(dateField: string, start: Date | null, end: Date | null) {
  if (!start && !end) return {};
  const filter: Record<string, unknown> = {};
  if (start) filter.gte = start;
  if (end) filter.lte = end;
  return { [dateField]: filter };
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(tenantId: string, filter: ReportFilterQuery): Promise<SalesSummaryReport> {
    const { startDate, endDate, periodLabel } = parsePeriodBounds(filter);
    const dateQuery = buildDateFilter('createdAt', startDate, endDate);

    // Enquiries
    const enquiries = await this.prisma.enquiry.findMany({
      where: {
        tenantId,
        ...dateQuery,
      },
      select: {
        id: true,
        status: true,
      },
    });

    const enquiriesByStatus: Record<string, number> = {
      new: 0,
      qualified: 0,
      proposal_sent: 0,
      won: 0,
      lost: 0,
    };
    for (const e of enquiries) {
      enquiriesByStatus[e.status] = (enquiriesByStatus[e.status] ?? 0) + 1;
    }

    const totalEnquiries = enquiries.length;
    const qualifiedCount =
      (enquiriesByStatus.qualified ?? 0) +
      (enquiriesByStatus.proposal_sent ?? 0) +
      (enquiriesByStatus.won ?? 0);
    const wonCount = enquiriesByStatus.won ?? 0;
    const qualificationRate = totalEnquiries > 0 ? round2((qualifiedCount / totalEnquiries) * 100) : 0;
    const winRate = totalEnquiries > 0 ? round2((wonCount / totalEnquiries) * 100) : 0;

    // Quotations
    const quotations = await this.prisma.quotation.findMany({
      where: {
        tenantId,
        ...dateQuery,
      },
      select: {
        id: true,
        quotationNumber: true,
        title: true,
        status: true,
        createdAt: true,
        enquiry: {
          select: {
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          select: {
            totalAmount: true,
          },
        },
      },
    });

    const quotationsByStatus: Record<string, number> = {
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      superseded: 0,
    };

    let totalQuotedValue = 0;
    let acceptedCount = 0;
    let acceptedValue = 0;

    const mappedQuotes = quotations.map((q) => {
      quotationsByStatus[q.status] = (quotationsByStatus[q.status] ?? 0) + 1;
      const amt = Number(q.revisions[0]?.totalAmount ?? 0);
      totalQuotedValue += amt;
      if (q.status === 'accepted') {
        acceptedCount += 1;
        acceptedValue += amt;
      }
      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        title: q.title,
        customerName: q.enquiry.customer.name,
        status: q.status,
        totalAmount: round2(amt),
        createdAt: q.createdAt.toISOString(),
      };
    });

    mappedQuotes.sort((a, b) => b.totalAmount - a.totalAmount);
    const topQuotations = mappedQuotes.slice(0, 5);

    const totalQuotations = quotations.length;
    const averageQuoteValue =
      totalQuotations > 0 ? round2(totalQuotedValue / totalQuotations) : 0;
    const acceptanceRate =
      totalQuotations > 0 ? round2((acceptedCount / totalQuotations) * 100) : 0;

    return {
      period: periodLabel,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      enquiries: {
        total: totalEnquiries,
        byStatus: enquiriesByStatus,
        qualificationRate,
        winRate,
      },
      quotations: {
        total: totalQuotations,
        totalQuotedValue: round2(totalQuotedValue),
        averageQuoteValue,
        acceptedCount,
        acceptedValue: round2(acceptedValue),
        acceptanceRate,
        byStatus: quotationsByStatus,
      },
      topQuotations,
    };
  }

  async getBookingSummary(
    tenantId: string,
    filter: ReportFilterQuery,
  ): Promise<BookingSummaryReport> {
    const { startDate, endDate, periodLabel } = parsePeriodBounds(filter);
    const dateQuery = buildDateFilter('eventDate', startDate, endDate);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        ...dateQuery,
      },
      select: {
        id: true,
        bookingNumber: true,
        title: true,
        status: true,
        eventDate: true,
        guestCount: true,
        totalAmount: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
    });

    const byStatus: Record<string, number> = {
      draft: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalConfirmedRevenue = 0;
    let confirmedOrCompletedCount = 0;
    let totalGuests = 0;
    let bookingsWithGuestsCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    const now = new Date();

    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
      const amt = Number(b.totalAmount);

      if (['confirmed', 'in_progress', 'completed'].includes(b.status)) {
        totalConfirmedRevenue += amt;
        confirmedOrCompletedCount += 1;
      }

      if (b.status === 'completed') {
        completedCount += 1;
      } else if (b.status === 'cancelled') {
        cancelledCount += 1;
      } else if (b.eventDate >= now && ['draft', 'confirmed', 'in_progress'].includes(b.status)) {
        upcomingCount += 1;
      }

      if (b.guestCount && b.guestCount > 0) {
        totalGuests += b.guestCount;
        bookingsWithGuestsCount += 1;
      }
    }

    const totalBookings = bookings.length;
    const averageBookingValue =
      confirmedOrCompletedCount > 0
        ? round2(totalConfirmedRevenue / confirmedOrCompletedCount)
        : 0;
    const averageGuests =
      bookingsWithGuestsCount > 0 ? round2(totalGuests / bookingsWithGuestsCount) : 0;

    const recentBookings = bookings.slice(0, 5).map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      title: b.title,
      customerName: b.customer.name,
      eventDate: b.eventDate.toISOString(),
      guestCount: b.guestCount,
      status: b.status,
      totalAmount: round2(Number(b.totalAmount)),
    }));

    return {
      period: periodLabel,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      totalBookings,
      totalConfirmedRevenue: round2(totalConfirmedRevenue),
      averageBookingValue,
      totalGuests,
      averageGuests,
      upcomingCount,
      completedCount,
      cancelledCount,
      byStatus,
      recentBookings,
    };
  }

  async getFinanceSummary(
    tenantId: string,
    filter: ReportFilterQuery,
  ): Promise<FinanceSummaryReport> {
    const { startDate, endDate, periodLabel } = parsePeriodBounds(filter);
    const invoiceDateQuery = buildDateFilter('issueDate', startDate, endDate);
    const paymentDateQuery = buildDateFilter('paymentDate', startDate, endDate);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...invoiceDateQuery,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
        dueDate: true,
      },
    });

    const now = new Date();
    const invoicesByStatus: Record<string, number> = {
      draft: 0,
      issued: 0,
      partially_paid: 0,
      paid: 0,
      void: 0,
    };

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      invoicesByStatus[inv.status] = (invoicesByStatus[inv.status] ?? 0) + 1;
      if (inv.status === 'void') continue;

      const total = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount);
      const balance = Number(inv.balanceDue);

      totalInvoiced += total;
      totalPaid += paid;
      totalOutstanding += balance;

      if (['issued', 'partially_paid'].includes(inv.status) && inv.dueDate < now) {
        totalOverdue += balance;
        overdueCount += 1;
      }
    }

    const collectionRate =
      totalInvoiced > 0 ? round2((totalPaid / totalInvoiced) * 100) : 0;

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        ...paymentDateQuery,
      },
      select: {
        id: true,
        amount: true,
        unallocatedAmount: true,
        paymentMethod: true,
        status: true,
      },
    });

    let totalPaymentsReceipts = 0;
    let unallocatedCredits = 0;
    const paymentMethods: Record<string, number> = {
      bank_transfer: 0,
      card: 0,
      cash: 0,
      upi: 0,
      cheque: 0,
      other: 0,
    };

    for (const p of payments) {
      if (p.status === 'void') continue;
      const amt = Number(p.amount);
      const unallocated = Number(p.unallocatedAmount);

      totalPaymentsReceipts += amt;
      unallocatedCredits += unallocated;
      const methodKey = p.paymentMethod in paymentMethods ? p.paymentMethod : 'other';
      paymentMethods[methodKey] = round2((paymentMethods[methodKey] ?? 0) + amt);
    }

    return {
      period: periodLabel,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      totalInvoiced: round2(totalInvoiced),
      totalPaid: round2(totalPaid),
      totalOutstanding: round2(totalOutstanding),
      totalOverdue: round2(totalOverdue),
      overdueCount,
      collectionRate,
      invoicesByStatus,
      totalPaymentsReceipts: round2(totalPaymentsReceipts),
      unallocatedCredits: round2(unallocatedCredits),
      paymentMethods,
    };
  }

  async getOperationsSummary(
    tenantId: string,
    filter: ReportFilterQuery,
  ): Promise<OperationsSummaryReport> {
    const { startDate, endDate, periodLabel } = parsePeriodBounds(filter);
    const dateQuery = buildDateFilter('serviceDate', startDate, endDate);

    // Meal Orders
    const mealOrders = await this.prisma.dailyMealOrder.findMany({
      where: {
        tenantId,
        ...dateQuery,
      },
      select: {
        id: true,
        status: true,
        serviceSlot: true,
        totalQuantity: true,
        totalAmount: true,
      },
    });

    const activePlansCount = await this.prisma.dailyMealPlan.count({
      where: {
        tenantId,
        status: 'active',
      },
    });

    const mealOrdersByStatus: Record<string, number> = {};
    const mealOrdersBySlot: Record<string, number> = {};
    let totalMealQuantity = 0;
    let totalMealValue = 0;

    for (const o of mealOrders) {
      mealOrdersByStatus[o.status] = (mealOrdersByStatus[o.status] ?? 0) + 1;
      mealOrdersBySlot[o.serviceSlot] = (mealOrdersBySlot[o.serviceSlot] ?? 0) + 1;
      totalMealQuantity += Number(o.totalQuantity);
      totalMealValue += Number(o.totalAmount);
    }

    // Inventory
    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isArchived: false,
      },
      select: {
        id: true,
        category: true,
        currentStock: true,
        minStockLevel: true,
        unitCost: true,
      },
    });

    let totalStockValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoryStats: Record<string, { itemCount: number; valuation: number }> = {};

    for (const item of inventoryItems) {
      const stock = Number(item.currentStock);
      const minStock = Number(item.minStockLevel);
      const unitCost = Number(item.unitCost);
      const valuation = round2(Math.max(0, stock) * Math.max(0, unitCost));

      totalStockValuation += valuation;

      if (stock <= 0) {
        outOfStockCount += 1;
      } else if (stock <= minStock) {
        lowStockCount += 1;
      }

      const existing = categoryStats[item.category] ?? { itemCount: 0, valuation: 0 };
      categoryStats[item.category] = {
        itemCount: existing.itemCount + 1,
        valuation: round2(existing.valuation + valuation),
      };
    }

    const byCategory = Object.entries(categoryStats).map(([cat, stats]) => ({
      category: cat,
      itemCount: stats.itemCount,
      valuation: stats.valuation,
    }));

    return {
      period: periodLabel,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      mealOrders: {
        totalOrders: mealOrders.length,
        totalQuantity: round2(totalMealQuantity),
        totalValue: round2(totalMealValue),
        activePlansCount,
        byStatus: mealOrdersByStatus,
        bySlot: mealOrdersBySlot,
      },
      inventory: {
        totalItems: inventoryItems.length,
        totalStockValuation: round2(totalStockValuation),
        lowStockCount,
        outOfStockCount,
        byCategory,
      },
    };
  }

  async getDashboardOverview(tenantId: string): Promise<DashboardOverviewReport> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Active Bookings
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['confirmed', 'in_progress'] },
      },
      select: {
        id: true,
        totalAmount: true,
        eventDate: true,
        bookingNumber: true,
        title: true,
      },
      orderBy: { eventDate: 'asc' },
    });

    let activeBookingsValue = 0;
    let upcomingBookingsCount = 0;
    for (const b of activeBookings) {
      activeBookingsValue += Number(b.totalAmount);
      if (b.eventDate >= today) {
        upcomingBookingsCount += 1;
      }
    }

    // 2. Pending Quotes
    const pendingQuotes = await this.prisma.quotation.findMany({
      where: {
        tenantId,
        status: { in: ['sent', 'draft'] },
      },
      select: {
        id: true,
        quotationNumber: true,
        title: true,
        status: true,
        validUntil: true,
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          select: {
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let pipelineQuotedValue = 0;
    let pendingQuotesCount = 0;
    for (const q of pendingQuotes) {
      const amt = Number(q.revisions[0]?.totalAmount ?? 0);
      pipelineQuotedValue += amt;
      if (q.status === 'sent') {
        pendingQuotesCount += 1;
      }
    }

    // 3. Finance & Invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'void' },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
        dueDate: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    let outstandingInvoiced = 0;
    let overdueInvoicesCount = 0;
    const overdueInvoicesList: Array<{ id: string; invoiceNumber: string; balanceDue: number }> = [];

    for (const inv of invoices) {
      const balance = Number(inv.balanceDue);
      outstandingInvoiced += balance;
      if (['issued', 'partially_paid'].includes(inv.status) && inv.dueDate < now) {
        overdueInvoicesCount += 1;
        if (overdueInvoicesList.length < 3) {
          overdueInvoicesList.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            balanceDue: round2(balance),
          });
        }
      }
    }

    // 4. Revenue collected
    const payments = await this.prisma.payment.aggregate({
      where: {
        tenantId,
        status: { not: 'void' },
      },
      _sum: {
        amount: true,
      },
    });
    const totalRevenueCollected = round2(Number(payments._sum.amount ?? 0));

    // 5. Low stock alerts
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isArchived: false,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        currentStock: true,
        minStockLevel: true,
      },
    });

    let lowStockAlertsCount = 0;
    const lowStockItemsList: Array<{ id: string; name: string; sku: string; current: number }> = [];

    for (const it of items) {
      const stock = Number(it.currentStock);
      const minStock = Number(it.minStockLevel);
      if (stock <= minStock) {
        lowStockAlertsCount += 1;
        if (lowStockItemsList.length < 3) {
          lowStockItemsList.push({
            id: it.id,
            name: it.name,
            sku: it.sku,
            current: stock,
          });
        }
      }
    }

    // 6. Meal orders scheduled
    const mealOrdersScheduledCount = await this.prisma.dailyMealOrder.count({
      where: {
        tenantId,
        serviceDate: { gte: today },
        status: { in: ['confirmed', 'in_preparation'] },
      },
    });

    // Generate recent alerts
    const recentAlerts: DashboardOverviewReport['recentAlerts'] = [];

    for (const ov of overdueInvoicesList) {
      recentAlerts.push({
        id: `inv-${ov.id}`,
        type: 'invoice_overdue',
        title: `Overdue Invoice ${ov.invoiceNumber}`,
        description: `Outstanding balance of ${ov.balanceDue} is past its payment due date.`,
        severity: 'error',
        link: `/invoices/${ov.id}`,
      });
    }

    const nextBookings = activeBookings.filter((b) => b.eventDate >= today).slice(0, 2);
    for (const bk of nextBookings) {
      recentAlerts.push({
        id: `bk-${bk.id}`,
        type: 'booking_upcoming',
        title: `Upcoming Event: ${bk.title}`,
        description: `Scheduled for ${bk.eventDate.toLocaleDateString()}. Fulfill catering requirements.`,
        severity: 'info',
        link: `/bookings/${bk.id}`,
      });
    }

    for (const ls of lowStockItemsList) {
      recentAlerts.push({
        id: `stk-${ls.id}`,
        type: 'stock_low',
        title: `Low Stock: ${ls.name} (${ls.sku})`,
        description: `Current quantity is ${ls.current}. Restock needed to prevent shortages.`,
        severity: 'warning',
        link: `/inventory`,
      });
    }

    return {
      period: 'all_time',
      kpi: {
        activeBookingsValue: round2(activeBookingsValue),
        confirmedBookingsCount: activeBookings.length,
        upcomingBookingsCount,
        pipelineQuotedValue: round2(pipelineQuotedValue),
        pendingQuotesCount,
        totalRevenueCollected,
        outstandingInvoiced: round2(outstandingInvoiced),
        overdueInvoicesCount,
        lowStockAlertsCount,
        mealOrdersScheduledCount,
      },
      recentAlerts,
    };
  }
}
