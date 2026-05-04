import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), CoursesModule],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
