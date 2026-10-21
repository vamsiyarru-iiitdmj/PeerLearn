import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { InsforgeService } from '../insforge/insforge.service';

@ApiTags('Health Check')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly insforgeService: InsforgeService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System health check verification' })
  async checkHealth() {
    let insforgeStatus = 'ok';
    try {
      const admin = this.insforgeService.getAdminClient();
      await admin.database.from('skills').select('id').limit(1);
    } catch (e) {
      insforgeStatus = 'degraded';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        insforge: insforgeStatus,
      },
    };
  }
}
