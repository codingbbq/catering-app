import type {
  CreateMenuRequest,
  DuplicateMenuRequest,
  Menu,
  MenuItem,
  MenuItemInput,
  MenuListResponse,
  MenuSearchParams,
  MenuStatus,
  UpdateMenuRequest,
} from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mapMenuItem(item: {
    id: string;
    menuId: string;
    catalogueItemId: string | null;
    section: string;
    name: string;
    description: string | null;
    quantity: Prisma.Decimal | number;
    unitPrice: Prisma.Decimal | number;
    costPrice: Prisma.Decimal | number | null;
    dietaryTags: string[];
    sortOrder: number;
    servingNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MenuItem {
    return {
      id: item.id,
      menuId: item.menuId,
      catalogueItemId: item.catalogueItemId,
      section: item.section,
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      costPrice: item.costPrice !== null ? Number(item.costPrice) : null,
      dietaryTags: item.dietaryTags,
      sortOrder: item.sortOrder,
      servingNotes: item.servingNotes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapMenu(
    menu: {
      id: string;
      tenantId: string;
      name: string;
      description: string | null;
      serviceStyle: string | null;
      status: string;
      minGuests: number | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
      items?: Array<{
        id: string;
        menuId: string;
        catalogueItemId: string | null;
        section: string;
        name: string;
        description: string | null;
        quantity: Prisma.Decimal | number;
        unitPrice: Prisma.Decimal | number;
        costPrice: Prisma.Decimal | number | null;
        dietaryTags: string[];
        sortOrder: number;
        servingNotes: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
    },
  ): Menu {
    const items = (menu.items || []).map((i) => this.mapMenuItem(i));
    let totalSellingPrice = 0;
    let totalCostPrice = 0;
    let hasCost = false;

    for (const item of items) {
      totalSellingPrice += item.unitPrice * item.quantity;
      if (item.costPrice !== null && item.costPrice !== undefined) {
        totalCostPrice += item.costPrice * item.quantity;
        hasCost = true;
      }
    }

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      serviceStyle: menu.serviceStyle,
      status: menu.status as MenuStatus,
      minGuests: menu.minGuests,
      notes: menu.notes,
      items,
      itemsCount: items.length,
      totalSellingPrice: Math.round(totalSellingPrice * 100) / 100,
      totalCostPrice: hasCost ? Math.round(totalCostPrice * 100) / 100 : null,
      createdAt: menu.createdAt.toISOString(),
      updatedAt: menu.updatedAt.toISOString(),
    };
  }

  async listMenus(
    tenantId: string,
    filters?: MenuSearchParams,
  ): Promise<MenuListResponse> {
    const where: Prisma.MenuWhereInput = { tenantId };

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status as MenuStatus;
    }

    if (filters?.serviceStyle && filters.serviceStyle !== 'all') {
      where.serviceStyle = { equals: filters.serviceStyle, mode: 'insensitive' };
    }

    if (filters?.search) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [menus, allMenusForStats] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        include: {
          items: {
            orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.menu.findMany({
        where: { tenantId },
        select: { status: true },
      }),
    ]);

    let activeCount = 0;
    let draftCount = 0;
    let archivedCount = 0;

    for (const m of allMenusForStats) {
      if (m.status === 'active') activeCount++;
      else if (m.status === 'draft') draftCount++;
      else if (m.status === 'archived') archivedCount++;
    }

    return {
      data: menus.map((m) => this.mapMenu(m)),
      total: menus.length,
      stats: {
        totalMenus: allMenusForStats.length,
        activeMenus: activeCount,
        draftMenus: draftCount,
        archivedMenus: archivedCount,
      },
    };
  }

  async getMenuById(tenantId: string, menuId: string): Promise<Menu> {
    const menu = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
      include: {
        items: {
          orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!menu) {
      throw new NotFoundException(`Menu not found: ${menuId}`);
    }

    return this.mapMenu(menu);
  }

  async createMenu(
    tenantId: string,
    userId: string,
    dto: CreateMenuRequest,
  ): Promise<Menu> {
    // Validate referenced catalogue items
    const preparedItems = await this.prepareMenuItems(tenantId, dto.items);

    const created = await this.prisma.$transaction(async (tx) => {
      const menu = await tx.menu.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          serviceStyle: dto.serviceStyle?.trim() || 'buffet',
          status: dto.status || 'active',
          minGuests: dto.minGuests || null,
          notes: dto.notes?.trim() || null,
        },
      });

      if (preparedItems.length > 0) {
        await tx.menuItem.createMany({
          data: preparedItems.map((item, idx) => ({
            menuId: menu.id,
            catalogueItemId: item.catalogueItemId || null,
            section: item.section || 'General',
            name: item.name,
            description: item.description || null,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            costPrice: item.costPrice ?? null,
            dietaryTags: item.dietaryTags || [],
            sortOrder: item.sortOrder ?? idx,
            servingNotes: item.servingNotes || null,
          })),
        });
      }

      return tx.menu.findUniqueOrThrow({
        where: { id: menu.id },
        include: {
          items: {
            orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'menu.created',
      outcome: 'allowed',
      reason: `Menu "${dto.name}" created`,
      metadata: { menuId: created.id, userId, itemsCount: String(preparedItems.length) },
    });

    return this.mapMenu(created);
  }

  async updateMenu(
    tenantId: string,
    menuId: string,
    userId: string,
    dto: UpdateMenuRequest,
  ): Promise<Menu> {
    const existing = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Menu not found: ${menuId}`);
    }

    let preparedItems: MenuItemInput[] | undefined;
    if (dto.items !== undefined) {
      preparedItems = await this.prepareMenuItems(tenantId, dto.items);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.menu.update({
        where: { id: menuId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.serviceStyle !== undefined ? { serviceStyle: dto.serviceStyle?.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.minGuests !== undefined ? { minGuests: dto.minGuests } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        },
      });

      if (preparedItems !== undefined) {
        // Replace menu items
        await tx.menuItem.deleteMany({
          where: { menuId },
        });

        if (preparedItems.length > 0) {
          await tx.menuItem.createMany({
            data: preparedItems.map((item, idx) => ({
              menuId,
              catalogueItemId: item.catalogueItemId || null,
              section: item.section || 'General',
              name: item.name,
              description: item.description || null,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice ?? 0,
              costPrice: item.costPrice ?? null,
              dietaryTags: item.dietaryTags || [],
              sortOrder: item.sortOrder ?? idx,
              servingNotes: item.servingNotes || null,
            })),
          });
        }
      }

      return tx.menu.findUniqueOrThrow({
        where: { id: menuId },
        include: {
          items: {
            orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'menu.updated',
      outcome: 'allowed',
      reason: `Menu "${updated.name}" updated`,
      metadata: { menuId, userId, itemsCount: String(updated.items.length) },
    });

    return this.mapMenu(updated);
  }

  async duplicateMenu(
    tenantId: string,
    menuId: string,
    userId: string,
    dto: DuplicateMenuRequest,
  ): Promise<Menu> {
    const original = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
      include: {
        items: {
          orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!original) {
      throw new NotFoundException(`Menu not found: ${menuId}`);
    }

    const newName = dto.name?.trim() || `Copy of ${original.name}`;

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const menu = await tx.menu.create({
        data: {
          tenantId,
          name: newName,
          description: original.description,
          serviceStyle: original.serviceStyle,
          status: 'draft',
          minGuests: original.minGuests,
          notes: original.notes,
        },
      });

      if (original.items.length > 0) {
        await tx.menuItem.createMany({
          data: original.items.map((item, idx) => ({
            menuId: menu.id,
            catalogueItemId: item.catalogueItemId,
            section: item.section,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            dietaryTags: item.dietaryTags,
            sortOrder: item.sortOrder ?? idx,
            servingNotes: item.servingNotes,
          })),
        });
      }

      return tx.menu.findUniqueOrThrow({
        where: { id: menu.id },
        include: {
          items: {
            orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'menu.duplicated',
      outcome: 'allowed',
      reason: `Menu "${original.name}" duplicated as "${newName}"`,
      metadata: { sourceMenuId: menuId, newMenuId: duplicated.id, userId },
    });

    return this.mapMenu(duplicated);
  }

  async archiveMenu(tenantId: string, menuId: string, userId: string): Promise<Menu> {
    const existing = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Menu not found: ${menuId}`);
    }

    const updated = await this.prisma.menu.update({
      where: { id: menuId },
      data: { status: 'archived' },
      include: {
        items: {
          orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'menu.archived',
      outcome: 'allowed',
      reason: `Menu "${updated.name}" archived`,
      metadata: { menuId, userId },
    });

    return this.mapMenu(updated);
  }

  async reactivateMenu(tenantId: string, menuId: string, userId: string): Promise<Menu> {
    const existing = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Menu not found: ${menuId}`);
    }

    const updated = await this.prisma.menu.update({
      where: { id: menuId },
      data: { status: 'active' },
      include: {
        items: {
          orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'menu.reactivated',
      outcome: 'allowed',
      reason: `Menu "${updated.name}" reactivated`,
      metadata: { menuId, userId },
    });

    return this.mapMenu(updated);
  }

  async deleteMenu(tenantId: string, menuId: string, userId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Menu not found: ${menuId}`);
    }

    await this.prisma.menu.delete({
      where: { id: menuId },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'menu.deleted',
      outcome: 'allowed',
      reason: `Menu "${existing.name}" deleted`,
      metadata: { menuId, userId },
    });

    return { success: true };
  }

  private async prepareMenuItems(
    tenantId: string,
    items?: MenuItemInput[],
  ): Promise<MenuItemInput[]> {
    if (!items || items.length === 0) return [];

    const catalogueItemIds = items
      .map((i) => i.catalogueItemId)
      .filter((id): id is string => Boolean(id));

    let catalogueMap = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        sellingPrice: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        dietaryTags: string[];
      }
    >();

    if (catalogueItemIds.length > 0) {
      const catalogueItems = await this.prisma.catalogueItem.findMany({
        where: {
          id: { in: catalogueItemIds },
          tenantId,
        },
      });

      catalogueMap = new Map(catalogueItems.map((ci) => [ci.id, ci]));
    }

    return items.map((item, idx) => {
      let name = item.name;
      let description = item.description;
      let unitPrice = item.unitPrice ?? 0;
      let costPrice = item.costPrice ?? null;
      let dietaryTags = item.dietaryTags || [];

      if (item.catalogueItemId) {
        const catItem = catalogueMap.get(item.catalogueItemId);
        if (catItem) {
          if (!name) name = catItem.name;
          if (description === undefined) description = catItem.description;
          if (unitPrice === 0 || unitPrice === undefined) {
            unitPrice = Number(catItem.sellingPrice);
          }
          if (costPrice === null || costPrice === undefined) {
            costPrice = catItem.costPrice !== null ? Number(catItem.costPrice) : null;
          }
          if (dietaryTags.length === 0) {
            dietaryTags = catItem.dietaryTags;
          }
        }
      }

      return {
        ...item,
        name: name || 'Item',
        description,
        unitPrice,
        costPrice,
        dietaryTags,
        sortOrder: item.sortOrder ?? idx,
      };
    });
  }
}
