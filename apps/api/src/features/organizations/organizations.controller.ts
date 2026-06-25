import { Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AuthUser, TenantContext, OrgRole } from '../../common/request-context.js';
import { slugSchema } from '@eventforge/domain';
import { OrganizationsService } from './organizations.service.js';

const CreateOrgBodySchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  defaultCurrency: z.string().max(3).optional(),
  defaultLocale: z.string().max(8).optional(),
});

const UpdateOrgBodySchema = CreateOrgBodySchema.partial();

@ApiTags('organizations')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization' })
  async create(
    @CurrentUser() user: AuthUser,
    @CurrentTenant() ctx: TenantContext,
    @Body(new ZodValidationPipe(CreateOrgBodySchema))
    body: z.infer<typeof CreateOrgBodySchema>,
  ) {
    return this.organizationsService.create(user, body, ctx.requestId);
  }

  @Get(':id')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get organization by id' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrgBodySchema))
    body: z.infer<typeof UpdateOrgBodySchema>,
  ) {
    return this.organizationsService.update(ctx, id, body);
  }
}
