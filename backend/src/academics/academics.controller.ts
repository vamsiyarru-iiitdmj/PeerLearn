import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicsService } from './academics.service';
import { Public } from '../common/decorators/public.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('Academic Records')
@Controller('api/v1/academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Public()
  @Get('verify/:rollNumber')
  @ApiOperation({ summary: 'Verify roll number existence in academic records before registration' })
  async verifyRollNumber(@Param('rollNumber') rollNumber: string) {
    return this.academicsService.verifyRollNumber(rollNumber);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @Post('import')
  @ApiOperation({ summary: 'Admin import of authoritative academic records CSV payload' })
  async importRecords(@Body() body: { records: any[]; filename?: string }) {
    return this.academicsService.importAcademicRecords(body.records, body.filename);
  }
}
