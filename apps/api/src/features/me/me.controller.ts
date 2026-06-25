import { Controller, Get, UseGuards, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/request-context.js';
import { MeService } from './me.service.js';

@ApiTags('me')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard)
@Controller('me')
export class MeController {
  constructor(@Inject(MeService) private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile and organizations' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.meService.getProfile(user);
  }
}
