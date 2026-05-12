import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './assignment.entity';
import { AssignmentSubmission } from './assignment-submission.entity';
import { AssignmentPrivateComment } from './assignment-private-comment.entity';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private submissionRepo: Repository<AssignmentSubmission>,
    @InjectRepository(AssignmentPrivateComment)
    private privateCommentRepo: Repository<AssignmentPrivateComment>,
    private coursesService: CoursesService,
  ) {}

  async getById(id: number) {
    if (!id) return null;
    return this.assignmentRepo.findOne({ where: { id } });
  }

  async create(
    courseId: number,
    title: string,
    description: string,
    dueDate?: string | null,
    kind?: 'assignment' | 'material' | null,
    maxPoints?: number | null,
  ) {
    const cleanTitle = (title || '').trim();
    const cleanDescription = (description || '').trim();
    if (!cleanTitle) throw new BadRequestException('Assignment title required');
    if (!cleanDescription) throw new BadRequestException('Assignment description required');

    const course = await this.coursesService.getById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const normalizedKind = (kind || 'assignment').toLowerCase();
    if (normalizedKind !== 'assignment' && normalizedKind !== 'material') {
      throw new BadRequestException('Invalid assignment kind');
    }

    let dueAt: Date | null = null;
    const cleanDueDate = (dueDate || '').trim();
    if (cleanDueDate) {
      const parsed = new Date(cleanDueDate);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid due date');
      dueAt = parsed;
    }

    const assignment = this.assignmentRepo.create({
      title: cleanTitle,
      description: cleanDescription,
      kind: normalizedKind as 'assignment' | 'material',
      due_at: dueAt,
      max_points: typeof maxPoints === 'number' && !Number.isNaN(maxPoints) ? Math.max(1, Math.min(1000, Math.floor(maxPoints))) : 100,
      course,
    });

    return this.assignmentRepo.save(assignment);
  }

  async listByCourse(courseId: number) {
    return this.assignmentRepo.find({
      where: { course: { id: courseId } } as any,
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: number) {
    const found = await this.assignmentRepo.findOne({ where: { id } });
    if (!found) return false;
    await this.assignmentRepo.remove(found);
    return true;
  }

  async update(id: number, patch: { title?: string; description?: string; dueDate?: string | null; kind?: string | null; maxPoints?: number | null }) {
    const found = await this.getById(id);
    if (!found) throw new NotFoundException('Assignment not found');

    if (typeof patch.title === 'string') found.title = (patch.title || '').trim();
    if (typeof patch.description === 'string') found.description = (patch.description || '').trim();
    if (patch.dueDate !== undefined) {
      const cleanDueDate = (patch.dueDate || '').toString().trim();
      if (cleanDueDate) {
        const parsed = new Date(cleanDueDate);
        if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid due date');
        found.due_at = parsed;
      } else {
        found.due_at = null;
      }
    }
    if (patch.kind !== undefined && patch.kind !== null) {
      const normalizedKind = (patch.kind || 'assignment').toString().toLowerCase();
      if (normalizedKind !== 'assignment' && normalizedKind !== 'material') throw new BadRequestException('Invalid assignment kind');
      found.kind = normalizedKind as any;
    }
    if (patch.maxPoints !== undefined) {
      const mp = patch.maxPoints === null ? null : Number(patch.maxPoints || 0);
      if (mp === null) {
        found.max_points = 100;
      } else {
        if (Number.isNaN(mp)) throw new BadRequestException('Invalid maxPoints');
        found.max_points = Math.max(1, Math.min(1000, Math.floor(mp)));
      }
    }

    return this.assignmentRepo.save(found);
  }

  async setResource(assignmentId: number, originalFileName: string, storedFileName: string, mimeType: string, publicUrl: string) {
    const assignment = await this.getById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    assignment.resource_original_name = originalFileName || null;
    assignment.resource_mime = mimeType || null;
    assignment.resource_url = publicUrl || null;
    assignment.resource_stored_name = storedFileName || null;
    return this.assignmentRepo.save(assignment);
  }

  async saveSubmission(
    assignmentId: number,
    studentEmail: string,
    file: {
      originalFileName: string;
      storedFileName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) throw new BadRequestException('Student email required');

    const assignment = await this.getById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const existing = await this.submissionRepo.findOne({
      where: { assignment: { id: assignmentId }, studentEmail: email } as any,
      order: { created_at: 'DESC' },
    });

    if (existing) {
      existing.originalFileName = file.originalFileName;
      existing.storedFileName = file.storedFileName;
      existing.mimeType = file.mimeType;
      existing.sizeBytes = String(file.sizeBytes || 0);
      return this.submissionRepo.save(existing);
    }

    const created = this.submissionRepo.create({
      assignment,
      studentEmail: email,
      originalFileName: file.originalFileName,
      storedFileName: file.storedFileName,
      mimeType: file.mimeType,
      sizeBytes: String(file.sizeBytes || 0),
    });
    return this.submissionRepo.save(created);
  }

  async setSubmissionGrade(submissionId: number, graderEmail: string | null, grade: number | null) {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) throw new NotFoundException('Submission not found');

    const max = Number((submission.assignment as any)?.max_points || 100);

    if (grade === null) {
      submission.grade = null;
    } else {
      const g = Number(grade);
      if (Number.isNaN(g)) throw new BadRequestException('Invalid grade');
      if (g < 0 || g > max) throw new BadRequestException(`Grade must be between 0 and ${max}`);
      submission.grade = Math.floor(g);
    }

    submission.graded_at = new Date();
    submission.graded_by = (graderEmail || '').toLowerCase().trim() || null;

    return this.submissionRepo.save(submission);
  }

  async listStudentSubmissions(courseId: number, studentEmail: string) {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email) return [];

    return this.submissionRepo.find({
      where: { studentEmail: email, assignment: { course: { id: courseId } } } as any,
      order: { created_at: 'DESC' },
    });
  }

  async getSubmissionById(id: number) {
    if (!id) return null;
    return this.submissionRepo.findOne({ where: { id } });
  }

  async listSubmissionsForAssignment(assignmentId: number) {
    if (!assignmentId) return [];
    return this.submissionRepo.find({
      where: { assignment: { id: assignmentId } } as any,
      order: { created_at: 'DESC' },
    });
  }

  async getStudentSubmissionForAssignment(assignmentId: number, studentEmail: string) {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email || !assignmentId) return null;
    return this.submissionRepo.findOne({
      where: { assignment: { id: assignmentId }, studentEmail: email } as any,
      order: { created_at: 'DESC' },
    });
  }

  async listPrivateComments(assignmentId: number, studentEmail: string) {
    const email = (studentEmail || '').toLowerCase().trim();
    if (!email || !assignmentId) return [];
    return this.privateCommentRepo.find({
      where: { assignment: { id: assignmentId }, studentEmail: email } as any,
      order: { created_at: 'ASC' },
    });
  }

  async listAllPrivateCommentsForAssignment(assignmentId: number) {
    if (!assignmentId) return [];
    return this.privateCommentRepo.find({
      where: { assignment: { id: assignmentId } } as any,
      order: { created_at: 'ASC' },
    });
  }

  async addPrivateComment(
    assignmentId: number,
    studentEmail: string,
    authorName: string,
    authorRole: 'student' | 'professor',
    content: string,
  ) {
    const email = (studentEmail || '').toLowerCase().trim();
    const cleanAuthorName = (authorName || '').trim();
    const cleanContent = (content || '').trim();
    const role = (authorRole || '').toLowerCase() as 'student' | 'professor';

    if (!email) throw new BadRequestException('Student email required');
    if (!cleanAuthorName) throw new BadRequestException('Author name required');
    if (!cleanContent) throw new BadRequestException('Comment content required');
    if (role !== 'student' && role !== 'professor') throw new BadRequestException('Invalid author role');

    const assignment = await this.getById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const created = this.privateCommentRepo.create({
      assignment,
      studentEmail: email,
      authorName: cleanAuthorName,
      authorRole: role,
      content: cleanContent,
    });

    return this.privateCommentRepo.save(created);
  }
}
