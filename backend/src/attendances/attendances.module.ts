import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceSession } from './attendance-session.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceSession, AttendanceRecord]), CoursesModule, EnrollmentsModule],
  providers: [AttendancesService],
  controllers: [AttendancesController],
  exports: [AttendancesService],
})
export class AttendancesModule {}
