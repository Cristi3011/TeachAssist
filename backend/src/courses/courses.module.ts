import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Course]), UserModule],
  providers: [CoursesService],
  controllers: [CoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
