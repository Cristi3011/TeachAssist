import { Controller, Post, Body, Get, Query, Delete, Param, Patch, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Post()
  async create(@Body() body: { title: string; description?: string; professorEmail: string }) {
    const saved = await this.courses.create(body.title, body.description || '', body.professorEmail);
    return {
      message: 'Course created',
      course: {
        id: saved.id,
        title: saved.title,
        professor: {
          username: saved.professor?.username || saved.professor?.email,
          email: saved.professor?.email,
          avatarUrl: (saved.professor as any)?.avatarUrl || null,
          avatarColor: (saved.professor as any)?.avatarColor || null,
        },
      },
    };
  }

  @Get()
  async listAll(@Query('limit') limit?: string) {
    const take = limit ? Number(limit) : undefined;
    const all = await this.courses.listAll(take);
    return all.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      professor: {
        username: c.professor?.username || c.professor?.email,
        email: (c.professor as any)?.email,
        avatarUrl: (c.professor as any)?.avatarUrl || null,
        avatarColor: (c.professor as any)?.avatarColor || null,
      },
      created_at: c.created_at,
    }));
  }

  @Get('by')
  async listBy(@Query('professorEmail') professorEmail?: string, @Query('limit') limit?: string) {
    const take = limit ? Number(limit) : undefined;
    const list = await this.courses.listByProfessorEmail(professorEmail || '', take);
    return list.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      professor: {
        username: c.professor?.username || c.professor?.email,
        email: (c.professor as any)?.email,
        avatarUrl: (c.professor as any)?.avatarUrl || null,
        avatarColor: (c.professor as any)?.avatarColor || null,
      },
      created_at: c.created_at,
    }));
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const course = await this.courses.getById(Number(id));
    if (!course) throw new NotFoundException('Course not found');
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      professor: {
        username: course.professor?.username || course.professor?.email,
        email: (course.professor as any)?.email,
        avatarUrl: (course.professor as any)?.avatarUrl || null,
        avatarColor: (course.professor as any)?.avatarColor || null,
      },
      created_at: course.created_at,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { title: string; description?: string }) {
    const saved = await this.courses.update(Number(id), body.title, body.description || '');
    return {
      message: 'Course updated',
      course: {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        professor: {
          username: saved.professor?.username || saved.professor?.email,
          email: (saved.professor as any)?.email,
          avatarUrl: (saved.professor as any)?.avatarUrl || null,
          avatarColor: (saved.professor as any)?.avatarColor || null,
        },
      },
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const removed = await this.courses.remove(Number(id));
    return { removed };
  }
}
