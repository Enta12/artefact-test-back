import { Module } from '@nestjs/common';
import { ColumnController } from './column.controller';
import { ColumnService } from './column.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ColumnController],
  providers: [ColumnService],
  exports: [ColumnService],
})
export class ColumnModule {}
