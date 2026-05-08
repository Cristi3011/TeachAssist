import { Controller, Post, Body, Param, Get, NotFoundException } from '@nestjs/common';
import { AttendancesService } from './attendances.service';

@Controller()
export class AttendancesController {
  constructor(private readonly attendances: AttendancesService) {}

  @Post('courses/:courseId/attendance/sessions')
  async createSession(
    @Param('courseId') courseId: string,
    @Body() body: { durationMinutes?: number; startsAt?: string; createdByEmail?: string; maxUses?: number },
  ) {
    const duration = body.durationMinutes ? Number(body.durationMinutes) : undefined;
    const startsAt = body.startsAt ? new Date(body.startsAt) : undefined;
    const created = await this.attendances.createSession(Number(courseId), duration, startsAt, body.createdByEmail, body.maxUses);
    return { message: 'Session created', session: { id: created.id, token: created.token, startsAt: created.startsAt, endsAt: created.endsAt } };
  }

  @Post('attendance/mark')
  async mark(@Body() body: { token: string; studentEmail: string }) {
    const rec = await this.attendances.markAttendance(body.token, body.studentEmail, { source: 'qr' });
    return { message: 'Attendance marked', record: { id: rec.id, created_at: rec.created_at } };
  }

  @Get('courses/:courseId/attendance/sessions')
  async listForCourse(@Param('courseId') courseId: string) {
    const list = await this.attendances.listSessionsForCourse(Number(courseId));
    return list.map((s) => ({ id: s.id, token: s.token, startsAt: s.startsAt, endsAt: s.endsAt, created_at: s.created_at }));
  }
}
