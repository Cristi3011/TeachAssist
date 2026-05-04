import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './announcement.entity';
import { AnnouncementComment } from './announcement-comment.entity';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, AnnouncementComment]), CoursesModule],
  providers: [AnnouncementsService],
  controllers: [AnnouncementsController],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
