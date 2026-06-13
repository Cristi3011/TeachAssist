import { Controller, Post, Body, Param, Get, NotFoundException, Query } from '@nestjs/common';
import { AttendancesService } from './attendances.service';

class CreateSessionDto {
  startTime?: string;
  endTime?: string;
  year?: number;
  group?: string;
}

class OpenSessionDto {
  durationMinutes?: number;
}

class ScanDto {
  token: string;
  studentEmail: string;
}

@Controller()
export class AttendancesController {
  constructor(private readonly attendances: AttendancesService) {}

  @Post('courses/:courseId/sessions')
  async createSession(@Param('courseId') courseId: string, @Body() body: CreateSessionDto) {
    const startTime = body.startTime ? new Date(body.startTime) : undefined;
    const endTime = body.endTime ? new Date(body.endTime) : undefined;
    const created = await this.attendances.createSession(Number(courseId), startTime, endTime, body.year, body.group);
    return { message: 'Session created', session: { id: created.id, startTime: created.startTime, endTime: created.endTime, status: created.status } };
  }

  @Post('sessions/:sessionId/open')
  async openSession(@Param('sessionId') sessionId: string, @Body() body: OpenSessionDto) {
    const created = await this.attendances.openSession(Number(sessionId), body?.durationMinutes);
    return {
      message: 'Session opened',
      token: created.qrToken,
      qrExpiresAt: created.qrExpiresAt,
      sessionStart: created.startTime,
      sessionEnd: created.endTime,
    };
  }

  @Post('attendance/scan')
  async scan(@Body() body: ScanDto) {
    const rec = await this.attendances.markAttendance(body.token, body.studentEmail, { source: 'qr' });
    return { message: 'Attendance marked', record: { id: rec.id, created_at: rec.created_at } };
  }

  @Post('attendance/mark')
  async mark(@Body() body: ScanDto) {
    return this.scan(body);
  }

  @Get('courses/:courseId/sessions')
  async listForCourse(@Param('courseId') courseId: string) {
    const list = await this.attendances.listSessionsForCourse(Number(courseId));
    return list.map((s) => ({ id: s.id, startTime: s.startTime, endTime: s.endTime, year: s.year, group: s.group, status: s.status }));
  }

  @Get('sessions/:sessionId/attendance')
  async getAttendanceForSession(@Param('sessionId') sessionId: string) {
    const attendees = await this.attendances.getAttendeesForSession(Number(sessionId));
    return attendees.map((a) => ({ studentEmail: a.studentEmail, created_at: a.created_at, metadata: a.metadata }));
  }

  @Get('students/attendance')
  async studentAttendanceHistory(@Query('email') email?: string, @Query('courseId') courseId?: string) {
    if (!email) throw new NotFoundException('email query param required');
    const list = await this.attendances.getStudentHistory(email, courseId ? Number(courseId) : undefined);
    return list.map((r) => ({
      id: r.id,
      sessionId: r.session?.id,
      courseId: r.session?.course?.id,
      created_at: r.created_at,
      metadata: r.metadata,
      sessionStart: r.session?.startTime,
      sessionEnd: r.session?.endTime,
    }));
  }
}
