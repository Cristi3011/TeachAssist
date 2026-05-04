import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { AnnouncementComment } from './announcement-comment.entity';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementComment)
    private commentRepo: Repository<AnnouncementComment>,
    private coursesService: CoursesService,
  ) {}

  async create(courseId: number, title: string, content: string) {
    const cleanTitle = (title || '').trim();
    const cleanContent = (content || '').trim();
    if (!cleanTitle) throw new BadRequestException('Announcement title required');
    if (!cleanContent) throw new BadRequestException('Announcement content required');

    const course = await this.coursesService.getById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const announcement = this.announcementRepo.create({
      title: cleanTitle,
      content: cleanContent,
      course,
    });
    return this.announcementRepo.save(announcement);
  }

  async listByCourse(courseId: number) {
    return this.announcementRepo.find({
      where: { course: { id: courseId } } as any,
      relations: ['comments'],
      order: { created_at: 'DESC' },
    });
  }

  async addComment(announcementId: number, authorName: string, content: string) {
    const cleanAuthor = (authorName || '').trim();
    const cleanContent = (content || '').trim();

    if (!cleanAuthor) throw new BadRequestException('Author name required');
    if (!cleanContent) throw new BadRequestException('Comment content required');

    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    const comment = this.commentRepo.create({
      authorName: cleanAuthor,
      content: cleanContent,
      announcement,
    });

    return this.commentRepo.save(comment);
  }

  async remove(id: number) {
    const found = await this.announcementRepo.findOne({ where: { id } });
    if (!found) return false;
    await this.announcementRepo.remove(found);
    return true;
  }
}
