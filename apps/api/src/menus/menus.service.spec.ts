import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { MenusService } from './menus.service.js';

describe('MenusService', () => {
  let service: MenusService;
  let prisma: Partial<PrismaService>;
  let auditLogService: Partial<AuditLogService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const otherTenantId = '00000000-0000-0000-0000-000000000002';
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    prisma = {
      menu: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as unknown as PrismaService['menu'],
      menuItem: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      } as unknown as PrismaService['menuItem'],
      catalogueItem: {
        findMany: vi.fn(),
      } as unknown as PrismaService['catalogueItem'],
      $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          menu: prisma.menu,
          menuItem: prisma.menuItem,
        });
      }),
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new MenusService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('listMenus', () => {
    it('returns filtered menus and calculated statistics for tenant', async () => {
      const mockMenus = [
        {
          id: 'menu-1',
          tenantId,
          name: 'Executive Luncheon',
          description: 'Three course lunch',
          serviceStyle: 'buffet',
          status: 'active',
          minGuests: 20,
          notes: 'Standard setup',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          items: [
            {
              id: 'mi-1',
              menuId: 'menu-1',
              catalogueItemId: 'cat-1',
              section: 'Mains',
              name: 'Salmon',
              description: 'Fresh',
              quantity: 1,
              unitPrice: 25.0,
              costPrice: 10.0,
              dietaryTags: ['halal'],
              sortOrder: 0,
              servingNotes: null,
              createdAt: new Date('2026-01-01T00:00:00Z'),
              updatedAt: new Date('2026-01-01T00:00:00Z'),
            },
          ],
        },
      ];

      (prisma.menu!.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockMenus)
        .mockResolvedValueOnce([
          { status: 'active' },
          { status: 'draft' },
          { status: 'archived' },
        ]);

      const result = await service.listMenus(tenantId, { status: 'active' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Executive Luncheon');
      expect(result.data[0]!.totalSellingPrice).toBe(25);
      expect(result.data[0]!.totalCostPrice).toBe(10);
      expect(result.stats).toEqual({
        totalMenus: 3,
        activeMenus: 1,
        draftMenus: 1,
        archivedMenus: 1,
      });
      expect(prisma.menu!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, status: 'active' },
        }),
      );
    });
  });

  describe('getMenuById', () => {
    it('returns single menu by id with items', async () => {
      const mockMenu = {
        id: 'menu-1',
        tenantId,
        name: 'Wedding Banquet',
        description: 'Deluxe banquet',
        serviceStyle: 'plated',
        status: 'active',
        minGuests: 50,
        notes: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        items: [],
      };

      (prisma.menu!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMenu);

      const result = await service.getMenuById(tenantId, 'menu-1');
      expect(result.id).toBe('menu-1');
      expect(result.name).toBe('Wedding Banquet');
      expect(prisma.menu!.findFirst).toHaveBeenCalledWith({
        where: { id: 'menu-1', tenantId },
        include: expect.any(Object),
      });
    });

    it('throws NotFoundException when menu not found or from another tenant', async () => {
      (prisma.menu!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(service.getMenuById(otherTenantId, 'menu-1')).rejects.toThrow(
        'Menu not found',
      );
    });
  });

  describe('createMenu', () => {
    it('creates a menu with snapshotted catalogue items and logs audit', async () => {
      const mockCatalogueItems = [
        {
          id: 'cat-1',
          tenantId,
          name: 'Herb Salmon',
          description: 'Delicious fish',
          sellingPrice: 30,
          costPrice: 12,
          dietaryTags: ['gluten_free'],
        },
      ];

      (prisma.catalogueItem!.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockCatalogueItems,
      );

      const createdMenu = {
        id: 'new-menu-1',
        tenantId,
        name: 'Seafood Special',
        description: 'Fresh seafood menu',
        serviceStyle: 'buffet',
        status: 'active',
        minGuests: 15,
        notes: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        items: [
          {
            id: 'item-1',
            menuId: 'new-menu-1',
            catalogueItemId: 'cat-1',
            section: 'Mains',
            name: 'Herb Salmon',
            description: 'Delicious fish',
            quantity: 1,
            unitPrice: 30,
            costPrice: 12,
            dietaryTags: ['gluten_free'],
            sortOrder: 0,
            servingNotes: 'Serve hot',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      };

      (prisma.menu!.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdMenu);
      (prisma.menu!.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        createdMenu,
      );

      const result = await service.createMenu(tenantId, userId, {
        name: 'Seafood Special',
        description: 'Fresh seafood menu',
        serviceStyle: 'buffet',
        status: 'active',
        minGuests: 15,
        items: [
          {
            catalogueItemId: 'cat-1',
            section: 'Mains',
            name: '',
            quantity: 1,
            unitPrice: 0,
            servingNotes: 'Serve hot',
          },
        ],
      });

      expect(result.name).toBe('Seafood Special');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.unitPrice).toBe(30);
      expect(result.items[0]!.costPrice).toBe(12);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'menu.created',
          outcome: 'allowed',
          tenantId,
        }),
      );
    });
  });

  describe('duplicateMenu', () => {
    it('clones a menu with its items and "Copy of" prefix in draft status', async () => {
      const original = {
        id: 'orig-1',
        tenantId,
        name: 'Original Banquet',
        description: 'Standard banquet',
        serviceStyle: 'buffet',
        status: 'active',
        minGuests: 30,
        notes: null,
        items: [
          {
            id: 'orig-item-1',
            menuId: 'orig-1',
            catalogueItemId: null,
            section: 'Starters',
            name: 'Soup',
            description: 'Tomato soup',
            quantity: 1,
            unitPrice: 6,
            costPrice: 2,
            dietaryTags: ['vegetarian'],
            sortOrder: 0,
            servingNotes: null,
          },
        ],
      };

      const cloned = {
        id: 'clone-1',
        tenantId,
        name: 'Copy of Original Banquet',
        description: 'Standard banquet',
        serviceStyle: 'buffet',
        status: 'draft',
        minGuests: 30,
        notes: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        items: [
          {
            id: 'new-item-1',
            menuId: 'clone-1',
            catalogueItemId: null,
            section: 'Starters',
            name: 'Soup',
            description: 'Tomato soup',
            quantity: 1,
            unitPrice: 6,
            costPrice: 2,
            dietaryTags: ['vegetarian'],
            sortOrder: 0,
            servingNotes: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      };

      (prisma.menu!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(original);
      (prisma.menu!.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(cloned);
      (prisma.menu!.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValueOnce(cloned);

      const result = await service.duplicateMenu(tenantId, 'orig-1', userId, {});

      expect(result.name).toBe('Copy of Original Banquet');
      expect(result.status).toBe('draft');
      expect(result.items).toHaveLength(1);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'menu.duplicated',
          outcome: 'allowed',
        }),
      );
    });
  });

  describe('archive and reactivate', () => {
    it('archives menu and records audit log', async () => {
      (prisma.menu!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'm-1',
        tenantId,
        name: 'Seasonal Menu',
      });
      (prisma.menu!.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'm-1',
        tenantId,
        name: 'Seasonal Menu',
        status: 'archived',
        description: null,
        serviceStyle: null,
        minGuests: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });

      const result = await service.archiveMenu(tenantId, 'm-1', userId);
      expect(result.status).toBe('archived');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'menu.archived',
        }),
      );
    });
  });
});
