import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InsforgeService } from './insforge.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [InsforgeService],
  exports: [InsforgeService],
})
export class InsforgeModule {}
