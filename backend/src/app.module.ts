import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './users/user.module';
import { InvitationsModule } from './invitations/invitations.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendancesModule } from './attendances/attendances.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'teachassist',
      password: 'Assistteachers',
      database: 'teachassist',
      autoLoadEntities: true,
      synchronize: true,
    }),
    UserModule,
    InvitationsModule,
    CoursesModule,
    EnrollmentsModule,
    AnnouncementsModule,
    AssignmentsModule,
    AttendancesModule,
  ],
})
export class AppModule {}
