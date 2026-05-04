import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Delete,
  Param,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { UserService } from '../users/user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService, private readonly usersService: UserService) {}

  private readonly uploadsDir = join(process.cwd(), 'uploads', 'submissions');

  private ensureUploadsDir() {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  @Post()
  async create(
    @Body()
    body: {
      courseId: number;
      title: string;
      description: string;
      dueDate?: string | null;
      kind?: 'assignment' | 'material' | null;
    },
  ) {
    const saved = await this.assignments.create(
      body.courseId,
      body.title,
      body.description,
      body.dueDate,
      body.kind,
    );

    return {
      message: 'Assignment created',
      assignment: {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        kind: saved.kind,
        due_at: saved.due_at,
        created_at: saved.created_at,
      },
    };
  }

  @Get()
  async list(@Query('courseId') courseId?: string) {
    const list = await this.assignments.listByCourse(Number(courseId));
    return list.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      kind: item.kind,
      due_at: item.due_at,
      created_at: item.created_at,
    }));
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const assignment = await this.assignments.getById(Number(id));
    if (!assignment) throw new NotFoundException('Assignment not found');
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      kind: assignment.kind,
      due_at: assignment.due_at,
      created_at: assignment.created_at,
      courseId: assignment.course?.id,
    };
  }

  @Get('submissions/mine')
  async listMine(@Query('courseId') courseId?: string, @Query('studentEmail') studentEmail?: string) {
    const list = await this.assignments.listStudentSubmissions(Number(courseId), studentEmail || '');
    return list.map((item) => ({
      id: item.id,
      assignmentId: item.assignment?.id,
      studentEmail: item.studentEmail,
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      sizeBytes: Number(item.sizeBytes || 0),
      created_at: item.created_at,
    }));
  }

  @Get(':id/submissions/mine')
  async mineForAssignment(@Param('id') id: string, @Query('studentEmail') studentEmail?: string) {
    const item = await this.assignments.getStudentSubmissionForAssignment(Number(id), studentEmail || '');
    if (!item) return null;
    return {
      id: item.id,
      assignmentId: item.assignment?.id,
      studentEmail: item.studentEmail,
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      sizeBytes: Number(item.sizeBytes || 0),
      created_at: item.created_at,
    };
  }

  @Get(':id/submissions')
  async listForAssignment(@Param('id') id: string) {
    const list = await this.assignments.listSubmissionsForAssignment(Number(id));
    return list.map((item) => ({
      id: item.id,
      assignmentId: item.assignment?.id,
      studentEmail: item.studentEmail,
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      sizeBytes: Number(item.sizeBytes || 0),
      created_at: item.created_at,
    }));
  }

  @Get(':id/comments')
  async listComments(@Param('id') id: string, @Query('studentEmail') studentEmail?: string) {
    const list = await this.assignments.listPrivateComments(Number(id), studentEmail || '');
    return list.map((item) => ({
      id: item.id,
      studentEmail: item.studentEmail,
      authorName: item.authorName,
      authorRole: item.authorRole,
      content: item.content,
      created_at: item.created_at,
    }));
  }

  @Get(':id/comments/all')
  async listAllComments(@Param('id') id: string) {
    const list = await this.assignments.listAllPrivateCommentsForAssignment(Number(id));
    return list.map((item) => ({
      id: item.id,
      studentEmail: item.studentEmail,
      authorName: item.authorName,
      authorRole: item.authorRole,
      content: item.content,
      created_at: item.created_at,
    }));
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() body: { studentEmail: string; authorName: string; authorRole: 'student' | 'professor'; content: string },
  ) {
    const saved = await this.assignments.addPrivateComment(
      Number(id),
      body.studentEmail,
      body.authorName,
      body.authorRole,
      body.content,
    );

    return {
      message: 'Comentariu adaugat',
      comment: {
        id: saved.id,
        studentEmail: saved.studentEmail,
        authorName: saved.authorName,
        authorRole: saved.authorRole,
        content: saved.content,
        created_at: saved.created_at,
      },
    };
  }

  @Post(':id/submissions')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async submit(
    @Param('id') id: string,
    @Body() body: { studentEmail: string },
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File required');

    const maxSizeBytes = 15 * 1024 * 1024;
    if ((file.size || 0) > maxSizeBytes) {
      throw new BadRequestException('Fisier prea mare (max 15MB)');
    }

    const allowedMime = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ]);

    const originalName = (file.originalname || 'submission').toString();
    const extension = (originalName.includes('.') ? originalName.split('.').pop() : 'bin') || 'bin';
    const normalizedExt = extension.toLowerCase();
    const allowedExt = new Set(['pdf', 'doc', 'docx', 'txt', 'zip', 'ppt', 'pptx']);

    if (!allowedMime.has((file.mimetype || '').toString()) && !allowedExt.has(normalizedExt)) {
      throw new BadRequestException('Tip fisier neacceptat. Acceptat: PDF, DOC, DOCX, TXT, ZIP, PPT, PPTX');
    }

    this.ensureUploadsDir();
    const safeOriginalBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeOriginalBase}`;
    const destination = join(this.uploadsDir, storedFileName);
    writeFileSync(destination, file.buffer);

    const saved = await this.assignments.saveSubmission(Number(id), body.studentEmail, {
      originalFileName: originalName,
      storedFileName,
      mimeType: (file.mimetype || 'application/octet-stream').toString(),
      sizeBytes: Number(file.size || 0),
    });

    return {
      message: 'Tema trimisa',
      submission: {
        id: saved.id,
        assignmentId: saved.assignment?.id,
        originalFileName: saved.originalFileName,
        mimeType: saved.mimeType,
        sizeBytes: Number(saved.sizeBytes || 0),
        created_at: saved.created_at,
      },
    };
  }

  @Get('submissions/:submissionId/file')
  async download(@Param('submissionId') submissionId: string, @Res() res: Response) {
    const submission = await this.assignments.getSubmissionById(Number(submissionId));
    if (!submission) throw new NotFoundException('Submission not found');

    const filePath = join(this.uploadsDir, submission.storedFileName);
    if (!existsSync(filePath)) throw new NotFoundException('Fisierul nu mai exista pe server');

    const contentType = submission.mimeType || 'application/octet-stream';
    const disposition = 'inline';
    res.setHeader('Content-Type', contentType);

    res.setHeader('Content-Disposition', `${disposition}; filename="${(submission.originalFileName || 'file').replace(/\"/g, '')}"`);
    return res.sendFile(filePath);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const removed = await this.assignments.remove(Number(id));
    return { removed };
  }
}
