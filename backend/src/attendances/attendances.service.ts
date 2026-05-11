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

  async createSession(courseId: number, startTime?: Date, endTime?: Date, year?: number, group?: string) {
    const course = await this.coursesService.getById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    const session = this.sessionsRepo.create({ course, startTime, endTime, year, group, status: 'scheduled' });
    return this.sessionsRepo.save(session);
  }

  async openSession(sessionId: number, durationMinutes?: number) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } as any });
    if (!session) throw new NotFoundException('Session not found');
    const token = randomBytes(16).toString('hex');
    const now = new Date();
    const sessionStart = new Date(now);
    sessionStart.setMinutes(0, 0, 0);
    const sessionEnd = new Date(sessionStart.getTime() + 60 * 60000);

    const qrDuration = durationMinutes && Number(durationMinutes) > 0 ? Number(durationMinutes) : 5;
    let qrExpiresAt = new Date(now.getTime() + qrDuration * 60000);

    if (qrExpiresAt.getTime() > sessionEnd.getTime()) qrExpiresAt = new Date(sessionEnd.getTime());

    session.qrToken = token;
    session.qrExpiresAt = qrExpiresAt;
    session.status = 'active';
    session.startTime = sessionStart;
    session.endTime = sessionEnd;
    return this.sessionsRepo.save(session);
  }

  async findByToken(token: string) {
    if (!token) return null;
    return this.sessionsRepo.findOne({ where: { qrToken: token } as any });
  }

  async markAttendance(token: string, studentEmail: string, metadata?: any) {
    const normalized = (studentEmail || '').toLowerCase().trim();
    if (!normalized) throw new BadRequestException('Student email required');

    const session = await this.findByToken(token);
    if (!session) throw new NotFoundException('Invalid token');

    const now = new Date();
    if (session.status !== 'active') throw new BadRequestException('Session not active');
    if (session.startTime && now < new Date(session.startTime)) throw new BadRequestException('Session not started yet');
    if (session.qrExpiresAt && now > new Date(session.qrExpiresAt)) throw new BadRequestException('Token expired');
    if (session.endTime && now > new Date(session.endTime)) throw new BadRequestException('Session expired');

    const enrollment = await this.enrollmentsService.findAcceptedForCourse(normalized, session.course.id, session.year, session.group);
    if (!enrollment) throw new BadRequestException('Student not enrolled or not accepted for this course/group/year');

    const existing = await this.recordsRepo.findOne({ where: { session: { id: session.id } as any, studentEmail: normalized } as any });
    if (existing) throw new ConflictException('Already marked');

    const record = this.recordsRepo.create({ session, studentEmail: normalized, metadata });
    return this.recordsRepo.save(record);
  }

  async listSessionsForCourse(courseId: number) {
    return this.sessionsRepo.find({ where: { course: { id: courseId } } as any, order: { startTime: 'DESC' } });
  }

  async getAttendeesForSession(sessionId: number) {
    return this.recordsRepo.find({ where: { session: { id: sessionId } } as any, order: { created_at: 'ASC' } });
  }

  async getStudentHistory(studentEmail: string, courseId?: number) {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) return [];
    const qb = this.recordsRepo.createQueryBuilder('r').leftJoinAndSelect('r.session', 's').leftJoin('s.course', 'c').where('r.studentEmail = :email', { email });
    if (courseId) qb.andWhere('c.id = :courseId', { courseId });
    qb.orderBy('r.created_at', 'DESC');
    return qb.getMany();
  }
}
