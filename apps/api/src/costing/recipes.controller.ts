import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createRecipeRequestSchema,
  recipeSearchParamsSchema,
  updateRecipeRequestSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { RecipesService } from './recipes.service.js';

@Controller()
@AccessScope('tenant')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('recipes')
  async listRecipes(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isArchived') isArchived?: 'true' | 'false' | 'all',
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = recipeSearchParamsSchema.parse({
      search,
      category,
      isArchived,
    });
    return this.recipesService.listRecipes(tenantCtx.tenantId, parsed);
  }

  @Post('recipes')
  async createRecipe(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createRecipeRequestSchema.parse(body);
    return this.recipesService.createRecipe(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('recipes/:recipeId')
  async getRecipe(
    @CurrentRequestContext() ctx: unknown,
    @Param('recipeId') recipeId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.recipesService.getRecipeById(tenantCtx.tenantId, recipeId);
  }

  @Patch('recipes/:recipeId')
  async updateRecipe(
    @CurrentRequestContext() ctx: unknown,
    @Param('recipeId') recipeId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateRecipeRequestSchema.parse(body);
    return this.recipesService.updateRecipe(
      tenantCtx.tenantId,
      recipeId,
      tenantCtx.userId,
      dto,
    );
  }

  @Delete('recipes/:recipeId')
  async deleteRecipe(
    @CurrentRequestContext() ctx: unknown,
    @Param('recipeId') recipeId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.recipesService.deleteRecipe(
      tenantCtx.tenantId,
      recipeId,
      tenantCtx.userId,
    );
  }
}
