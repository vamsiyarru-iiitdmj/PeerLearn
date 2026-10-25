import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoubtsService } from './doubts.service';
import { DoubtsController } from './doubts.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DoubtsController],
  providers: [DoubtsService],
  exports: [DoubtsService],
})
export class DoubtsModule {}
