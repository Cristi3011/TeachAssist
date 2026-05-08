import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceSession } from './attendance-session.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { randomBytes } from 'crypto';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(AttendanceSession)
    private sessionsRepo: Repository<AttendanceSession>,
    @InjectRepository(AttendanceRecord)
    private recordsRepo: Repository<AttendanceRecord>,
    private coursesService: CoursesService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  async createSession(courseId: number, durationMinutes?: number, startsAt?: Date, createdByEmail?: string, maxUses?: number) {
    const course = await this.coursesService.getById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const token = randomBytes(16).toString('hex');
    const now = new Date();
    const start = startsAt ? new Date(startsAt) : now;
    const end = durationMinutes ? new Date(start.getTime() + durationMinutes * 60000) : undefined;

    const session = this.sessionsRepo.create({ token, course, startsAt: start, endsAt: end, maxUses });
    return this.sessionsRepo.save(session);
  }

  async findByToken(token: string) {
    if (!token) return null;
    return this.sessionsRepo.findOne({ where: { token } });
  }

  async markAttendance(token: string, studentEmail: string, metadata?: any) {
    const normalized = (studentEmail || '').toLowerCase().trim();
    if (!normalized) throw new BadRequestException('Student email required');

    const session = await this.findByToken(token);
    if (!session) throw new NotFoundException('Invalid token');

    const now = new Date();
    if (session.startsAt && now < new Date(session.startsAt)) throw new BadRequestException('Session not started yet');
    if (session.endsAt && now > new Date(session.endsAt)) throw new BadRequestException('Session expired');

    // Verify student is enrolled in course
    const enrolled = await this.enrollmentsService.getEnrolled(normalized);
    const isEnrolled = enrolled.some((e: any) => e.course?.id === session.course.id);
    if (!isEnrolled) throw new BadRequestException('Student not enrolled in course');

    // Check existing record
    const existing = await this.recordsRepo.findOne({ where: { session: { id: session.id } as any, studentEmail: normalized } as any });
    if (existing) throw new ConflictException('Already marked');

    const record = this.recordsRepo.create({ session, studentEmail: normalized, metadata });
    return this.recordsRepo.save(record);
  }

  async listSessionsForCourse(courseId: number) {
    return this.sessionsRepo.find({ where: { course: { id: courseId } } as any, order: { created_at: 'DESC' } });
  }
}
