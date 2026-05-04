import { Controller, Post, Body, Get, Query, Delete, Param } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Post()
  async create(@Body() body: { courseId: number; title: string; content: string }) {
    const saved = await this.announcements.create(body.courseId, body.title, body.content);
    return {
      message: 'Announcement created',
      announcement: {
        id: saved.id,
        title: saved.title,
        content: saved.content,
        created_at: saved.created_at,
      },
    };
  }

  @Get()
  async list(@Query('courseId') courseId?: string) {
    const list = await this.announcements.listByCourse(Number(courseId));
    return list.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      created_at: item.created_at,
      comments: (item.comments || [])
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((c) => ({
          id: c.id,
          authorName: c.authorName,
          content: c.content,
          created_at: c.created_at,
        })),
    }));
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() body: { authorName: string; content: string },
  ) {
    const saved = await this.announcements.addComment(Number(id), body.authorName, body.content);
    return {
      message: 'Comment added',
      comment: {
        id: saved.id,
        authorName: saved.authorName,
        content: saved.content,
        created_at: saved.created_at,
      },
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const removed = await this.announcements.remove(Number(id));
    return { removed };
  }
}
