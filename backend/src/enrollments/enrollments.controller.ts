import { Controller, Post, Body, Get, Query, Patch, Param } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { UserService } from '../users/user.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService, private readonly usersService: UserService) {}

  /** POST /enrollments/invite — professor invites a student */
  @Post('invite')
  async invite(@Body() body: { studentEmail: string; courseId: number; year?: number; group?: string }) {
    const saved = await this.enrollments.invite(body.studentEmail, body.courseId, body.year, body.group);
    return {
      message: 'Invitation sent',
      enrollment: { id: saved.id, studentEmail: saved.studentEmail, courseId: saved.course?.id, status: saved.status, year: saved.year, group: saved.group },
    };
  }

  /** POST /enrollments/invite/bulk — professor invites many students at once */
  @Post('invite/bulk')
  async inviteBulk(@Body() body: { studentEmails: string[]; courseId: number }) {
    return this.enrollments.inviteBulk(body.studentEmails || [], body.courseId);
  }

  /** GET /enrollments/enrolled?email= — accepted courses for a student */
  @Get('enrolled')
  async enrolled(@Query('email') email?: string) {
    const list = await this.enrollments.getEnrolled(email || '');
    return list.map((e) => ({
      id: e.id,
      courseId: e.course?.id,
      title: e.course?.title,
      description: (e.course as any)?.description,
      professor: {
        username: (e.course as any)?.professor?.username || (e.course as any)?.professor?.email,
        email: (e.course as any)?.professor?.email,
        avatarUrl: (e.course as any)?.professor?.avatarUrl || null,
        avatarColor: (e.course as any)?.professor?.avatarColor || null,
      },
      created_at: e.course?.created_at,
      year: (e as any).year,
      group: (e as any).group,
    }));
  }

  /** GET /enrollments/invitations?email= — pending invitations for a student */
  @Get('invitations')
  async invitations(@Query('email') email?: string) {
    const list = await this.enrollments.getPending(email || '');
    return list.map((e) => ({
      id: e.id,
      courseId: e.course?.id,
      title: e.course?.title,
      description: (e.course as any)?.description,
      professor: {
        username: (e.course as any)?.professor?.username || (e.course as any)?.professor?.email,
        email: (e.course as any)?.professor?.email,
        avatarUrl: (e.course as any)?.professor?.avatarUrl || null,
        avatarColor: (e.course as any)?.professor?.avatarColor || null,
      },
      enrollmentCreatedAt: e.created_at,
      year: (e as any).year,
      group: (e as any).group,
    }));
  }

  @Get('course')
  async byCourse(@Query('courseId') courseId?: string) {
    const list = await this.enrollments.getByCourse(Number(courseId));
    const results = await Promise.all(
      list.map(async (e) => {
        let avatarUrl: string | null = null;
        let avatarColor: string | null = null;
        try {
          const u = await this.usersService.findByEmail(e.studentEmail || '');
          avatarUrl = u ? (u as any).avatarUrl || null : null;
          avatarColor = u ? (u as any).avatarColor || null : null;
        } catch {}
        return { id: e.id, studentEmail: e.studentEmail, status: e.status, created_at: e.created_at, year: (e as any).year, group: (e as any).group, avatarUrl, avatarColor };
      }),
    );
    return results;
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Body() body: { studentEmail: string; year?: number; group?: string }) {
    const updated = await this.enrollments.accept(Number(id), body.studentEmail, body.year, body.group);
    return { message: 'Accepted', status: updated.status };
  }

  /** PATCH /enrollments/:id/decline */
  @Patch(':id/decline')
  async decline(@Param('id') id: string, @Body() body: { studentEmail: string }) {
    const updated = await this.enrollments.decline(Number(id), body.studentEmail);
    return { message: 'Declined', status: updated.status };
  }
}
