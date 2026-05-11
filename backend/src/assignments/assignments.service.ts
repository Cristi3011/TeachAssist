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
