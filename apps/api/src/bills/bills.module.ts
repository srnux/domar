import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillPdfService } from './bill-pdf.service';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

@Module({
  imports: [AuthModule],
  controllers: [BillsController],
  providers: [BillsService, BillPdfService],
})
export class BillsModule {}
