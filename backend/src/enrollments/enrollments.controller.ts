import { Controller, Post, Body, Get, Query, Patch, Param } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  /** POST /enrollments/invite — professor invites a student */
  @Post('invite')
  async invite(@Body() body: { studentEmail: string; courseId: number }) {
    const saved = await this.enrollments.invite(body.studentEmail, body.courseId);
    return {
      message: 'Invitation sent',
      enrollment: { id: saved.id, studentEmail: saved.studentEmail, courseId: saved.course?.id, status: saved.status },
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
      professor: (e.course as any)?.professor?.username || (e.course as any)?.professor?.email,
      created_at: e.course?.created_at,
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
      professor: (e.course as any)?.professor?.username || (e.course as any)?.professor?.email,
      enrollmentCreatedAt: e.created_at,
    }));
  }

  /** GET /enrollments/course?courseId= — enrollments for a course (professor) */
  @Get('course')
  async byCourse(@Query('courseId') courseId?: string) {
    const list = await this.enrollments.getByCourse(Number(courseId));
    return list.map((e) => ({ id: e.id, studentEmail: e.studentEmail, status: e.status, created_at: e.created_at }));
  }

  /** PATCH /enrollments/:id/accept */
  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Body() body: { studentEmail: string }) {
    const updated = await this.enrollments.accept(Number(id), body.studentEmail);
    return { message: 'Accepted', status: updated.status };
  }

  /** PATCH /enrollments/:id/decline */
  @Patch(':id/decline')
  async decline(@Param('id') id: string, @Body() body: { studentEmail: string }) {
    const updated = await this.enrollments.decline(Number(id), body.studentEmail);
    return { message: 'Declined', status: updated.status };
  }
}
