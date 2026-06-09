import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentSubmission } from './assignment-submission.entity';
import { AssignmentPrivateComment } from './assignment-private-comment.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { StorageModule } from '../storage/storage.module';
import { CoursesModule } from '../courses/courses.module';
import { UserModule } from '../users/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, AssignmentSubmission, AssignmentPrivateComment]), CoursesModule, UserModule, AuthModule, StorageModule],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
