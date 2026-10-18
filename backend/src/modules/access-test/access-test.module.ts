import { Module } from '@nestjs/common';
import {
  AdminAccessTestController,
  SindicoAccessTestController,
} from './access-test.controller';

@Module({
  controllers: [SindicoAccessTestController, AdminAccessTestController],
})
export class AccessTestModule {}
