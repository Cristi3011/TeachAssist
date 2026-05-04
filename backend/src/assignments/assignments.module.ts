import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentSubmission } from './assignment-submission.entity';
import { AssignmentPrivateComment } from './assignment-private-comment.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { CoursesModule } from '../courses/courses.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, AssignmentSubmission, AssignmentPrivateComment]), CoursesModule, UserModule],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
