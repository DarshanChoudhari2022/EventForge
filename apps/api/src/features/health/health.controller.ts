import { Controller, Get, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  async getHealth(): Promise<{ status: string; timestamp: string; db: string }> {
    let db = 'unknown';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch (e) {
      db = 'error';
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db,
    };
  }
}
