import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcademicsService } from './academics.service';
import { AcademicsController } from './academics.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AcademicsController],
  providers: [AcademicsService],
  exports: [AcademicsService],
})
export class AcademicsModule {}
