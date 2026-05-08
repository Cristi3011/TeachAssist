import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollRepo: Repository<Enrollment>,
    private coursesService: CoursesService,
  ) {}

  /** Professor invites a student to a course */
  async invite(studentEmail: string, courseId: number, year?: number, group?: string): Promise<Enrollment> {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) throw new BadRequestException('Student email required');

    const course = await this.coursesService.getById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.enrollRepo.findOne({
      where: { studentEmail: email, course: { id: courseId } } as any,
    });
    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictException('Student already enrolled');
      }
      if (existing.status === 'pending') {
        throw new ConflictException('Student already invited');
      }
      existing.status = 'pending';
      return this.enrollRepo.save(existing);
    }

    const enrollment = new Enrollment();
    enrollment.studentEmail = email;
    enrollment.course = course;
    enrollment.status = 'pending';
    enrollment.year = typeof year !== 'undefined' && year !== null ? year : undefined;
    enrollment.group = typeof group !== 'undefined' && group !== null ? group : undefined;
    return this.enrollRepo.save(enrollment);
  }

  /** Professor invites multiple students to a course */
  async inviteBulk(studentEmails: string[], courseId: number): Promise<any> {
    if (!Array.isArray(studentEmails) || studentEmails.length === 0) {
      throw new BadRequestException('At least one student email is required');
    }

    if (studentEmails.length > 300) {
      throw new BadRequestException('Too many emails in one request (max 300)');
    }

    const normalizedUnique = Array.from(
      new Set(
        studentEmails
          .map((e) => (e || '').toString().toLowerCase().trim())
          .filter((e) => !!e),
      ),
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const results: Array<{ email: string; status: string }> = [];

    for (const email of normalizedUnique) {
      if (!emailRegex.test(email)) {
        results.push({ email, status: 'invalid_email' });
        continue;
      }

      try {
        await this.invite(email, courseId);
        results.push({ email, status: 'created' });
      } catch (err: any) {
        const msg = (err?.message || '').toString().toLowerCase();
        if (msg.includes('already invited')) {
          results.push({ email, status: 'already_invited' });
          continue;
        }
        if (msg.includes('already enrolled')) {
          results.push({ email, status: 'already_enrolled' });
          continue;
        }
        if (msg.includes('course not found')) {
          results.push({ email, status: 'course_not_found' });
          continue;
        }
        results.push({ email, status: 'error' });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.status === 'created').length,
      alreadyInvited: results.filter((r) => r.status === 'already_invited').length,
      alreadyEnrolled: results.filter((r) => r.status === 'already_enrolled').length,
      invalid: results.filter((r) => r.status === 'invalid_email').length,
      errors: results.filter((r) => r.status === 'error' || r.status === 'course_not_found').length,
    };

    return { summary, results };
  }

  async accept(id: number, studentEmail: string, year?: number, group?: string): Promise<Enrollment> {
    const email = (studentEmail || '').toLowerCase().trim();
    const found = await this.enrollRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Invitation not found');
    if (found.studentEmail !== email) throw new BadRequestException('Not your invitation');
    found.status = 'accepted';
    if (typeof year !== 'undefined') found.year = year;
    if (typeof group !== 'undefined') found.group = group;
    return this.enrollRepo.save(found);
  }

  async decline(id: number, studentEmail: string): Promise<Enrollment> {
    const email = (studentEmail || '').toLowerCase().trim();
    const found = await this.enrollRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Invitation not found');
    if (found.studentEmail !== email) throw new BadRequestException('Not your invitation');
    found.status = 'declined';
    return this.enrollRepo.save(found);
  }

  /** Get accepted enrollments for a student */
  async getEnrolled(studentEmail: string): Promise<Enrollment[]> {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) return [];
    return this.enrollRepo.find({ where: { studentEmail: email, status: 'accepted' } });
  }

  /** Get pending invitations for a student */
  async getPending(studentEmail: string): Promise<Enrollment[]> {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) return [];
    return this.enrollRepo.find({ where: { studentEmail: email, status: 'pending' } });
  }

  /** Get all enrollments for a course (for professor view) */
  async getByCourse(courseId: number): Promise<Enrollment[]> {
    return this.enrollRepo.find({ where: { course: { id: courseId } } as any });
  }

  /** Find accepted enrollment for a student in a specific course (optional year/group match) */
  async findAcceptedForCourse(studentEmail: string, courseId: number, year?: number, group?: string): Promise<Enrollment | null> {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) return null;
    const where: any = { studentEmail: email, course: { id: courseId }, status: 'accepted' };
    if (typeof year !== 'undefined' && year !== null) where.year = year;
    if (typeof group !== 'undefined' && group !== null) where.group = group;
    return this.enrollRepo.findOne({ where } as any);
  }
}
