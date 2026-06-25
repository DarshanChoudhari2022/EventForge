import { Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { TenantContext, OrgRole } from '../../common/request-context.js';
import { OrgRoleSchema } from '@eventforge/domain';
import { MembersService } from './members.service.js';

const InviteBodySchema = z.object({
  email: z.string().email(),
  role: OrgRoleSchema,
});

const UpdateRoleBodySchema = z.object({
  role: OrgRoleSchema,
});

@ApiTags('members')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('organizations/:orgId/members')
export class MembersController {
  constructor(@Inject(MembersService) private readonly membersService: MembersService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List organization members' })
  async list(@CurrentTenant() ctx: TenantContext) {
    return this.membersService.list(ctx);
  }

  @Post('invite')
  @Roles('admin')
  @ApiOperation({ summary: 'Invite a member by email' })
  async invite(
    @CurrentTenant() ctx: TenantContext,
    @Body(new ZodValidationPipe(InviteBodySchema))
    body: z.infer<typeof InviteBodySchema>,
  ) {
    return this.membersService.invite(ctx, body);
  }

  @Patch(':id/role')
  @Roles('admin')
  @ApiOperation({ summary: 'Update member role' })
  async updateRole(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoleBodySchema))
    body: z.infer<typeof UpdateRoleBodySchema>,
  ) {
    return this.membersService.updateRole(ctx, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove member from organization' })
  async remove(@CurrentTenant() ctx: TenantContext, @Param('id') id: string) {
    return this.membersService.remove(ctx, id);
  }
}
