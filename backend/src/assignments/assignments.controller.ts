import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Delete,
  Param,
  Patch,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { UserService } from '../users/user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

@Controller('assignments')
export class AssignmentsController {
  constructor(
    private readonly assignments: AssignmentsService,
    private readonly usersService: UserService,
    private readonly storageService: StorageService,
  ) {}

  private readonly uploadsDir = join(process.cwd(), 'uploads', 'submissions');

  private ensureUploadsDir() {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    body: {
      courseId: number;
      title: string;
      description: string;
      dueDate?: string | null;
      kind?: 'assignment' | 'material' | null;
      maxPoints?: number | null;
    },
  ) {
    const saved = await this.assignments.create(
      body.courseId,
      body.title,
      body.description,
      body.dueDate,
      body.kind,
      body.maxPoints,
    );

    return {
      message: 'Assignment created',
      assignment: {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        kind: saved.kind,
        due_at: saved.due_at,
        max_points: (saved as any).max_points || 100,
        maxPoints: (saved as any).max_points || 100,
        resource_url: (saved as any).resource_url || null,
        resource_original_name: (saved as any).resource_original_name || null,
        resource_mime: (saved as any).resource_mime || null,
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
      max_points: (item as any).max_points || 100,
      maxPoints: (item as any).max_points || 100,
      resource_url: (item as any).resource_url || null,
      resource_original_name: (item as any).resource_original_name || null,
      resource_mime: (item as any).resource_mime || null,
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
      max_points: (assignment as any).max_points || 100,
      maxPoints: (assignment as any).max_points || 100,
      resource_url: (assignment as any).resource_url || null,
      resource_original_name: (assignment as any).resource_original_name || null,
      resource_mime: (assignment as any).resource_mime || null,
      created_at: assignment.created_at,
      courseId: assignment.course?.id,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: { title?: string; description?: string; dueDate?: string | null; kind?: string | null; maxPoints?: number | null },
  ) {
    const saved = await this.assignments.update(Number(id), {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      kind: body.kind as any,
      maxPoints: body.maxPoints,
    });

    return {
      message: 'Assignment updated',
      assignment: {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        kind: saved.kind,
        due_at: saved.due_at,
        max_points: (saved as any).max_points || 100,
        maxPoints: (saved as any).max_points || 100,
        resource_url: (saved as any).resource_url || null,
        resource_original_name: (saved as any).resource_original_name || null,
        resource_mime: (saved as any).resource_mime || null,
        created_at: saved.created_at,
      },
    };
  }

  @Post(':id/resource/presign')
  @UseGuards(JwtAuthGuard)
  async presignResource(@Param('id') id: string, @Body() body: { filename: string; contentType: string }) {
    if (!body || !body.filename) throw new BadRequestException('filename required');
    const safe = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `materials/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`;
    const url = await this.storageService.getPresignedPutUrl(key, body.contentType || 'application/octet-stream');
    return { url, key };
  }

  @Post(':id/resource/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmResource(@Param('id') id: string, @Body() body: { key: string; originalName: string; contentType?: string }) {
    if (!body || !body.key || !body.originalName) throw new BadRequestException('key and originalName required');
    const publicUrl = ''; // we don't store public URL; serve via presigned GET when needed
    const saved = await this.assignments.setResource(Number(id), body.originalName, body.key, body.contentType || 'application/octet-stream', publicUrl);
    return {
      message: 'Resource metadata saved',
      resource: {
        resource_url: saved.resource_url,
        resource_original_name: saved.resource_original_name,
        resource_mime: saved.resource_mime,
      },
    };
  }

  @Get(':id/resource')
  async serveResource(@Param('id') id: string, @Res() res: Response) {
    const assignment = await this.assignments.getById(Number(id));
    if (!assignment) throw new NotFoundException('Assignment not found');
    const storedFile = (assignment as any).resource_stored_name || null;
    if (!storedFile) {
      throw new NotFoundException('Resource file not found');
    }
    const url = await this.storageService.getPresignedGetUrl(storedFile);
    return res.redirect(url);
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
      grade: typeof (item as any).grade === 'number' ? (item as any).grade : null,
      graded_at: (item as any).graded_at || null,
      graded_by: (item as any).graded_by || null,
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
      grade: typeof (item as any).grade === 'number' ? (item as any).grade : null,
      graded_at: (item as any).graded_at || null,
      graded_by: (item as any).graded_by || null,
      created_at: item.created_at,
    };
  }

  @Get(':id/submissions')
  async listForAssignment(@Param('id') id: string) {
    const list = await this.assignments.listSubmissionsForAssignment(Number(id));
    const results = await Promise.all(
      list.map(async (item) => {
        let studentName: string | null = null;
        try {
          const u = await this.usersService.findByEmail(item.studentEmail || '');
          studentName = u ? (u.username || u.email) : null;
        } catch {}

        return {
          id: item.id,
          assignmentId: item.assignment?.id,
          studentEmail: item.studentEmail,
          studentName,
          originalFileName: item.originalFileName,
          mimeType: item.mimeType,
          sizeBytes: Number(item.sizeBytes || 0),
          grade: typeof (item as any).grade === 'number' ? (item as any).grade : null,
          graded_at: (item as any).graded_at || null,
          graded_by: (item as any).graded_by || null,
          created_at: item.created_at,
        };
      }),
    );

    return results;
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

  @Post(':id/submissions/presign')
  @UseGuards(JwtAuthGuard)
  async presignSubmission(@Param('id') id: string, @Body() body: { filename: string; contentType: string }) {
    if (!body || !body.filename) throw new BadRequestException('filename required');
    const safe = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `submissions/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`;
    const url = await this.storageService.getPresignedPutUrl(key, body.contentType || 'application/octet-stream');
    return { url, key };
  }

  @Post(':id/submissions')
  @UseGuards(JwtAuthGuard)
  async submit(
    @Param('id') id: string,
    @Body() body: { studentEmail: string; key: string; originalFileName: string; mimeType?: string; sizeBytes?: number },
  ) {
    if (!body || !body.key) throw new BadRequestException('key required');

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

    const originalName = (body.originalFileName || 'submission').toString();
    const extension = (originalName.includes('.') ? originalName.split('.').pop() : 'bin') || 'bin';
    const normalizedExt = extension.toLowerCase();
    const allowedExt = new Set(['pdf', 'doc', 'docx', 'txt', 'zip', 'ppt', 'pptx']);

    if (!allowedMime.has((body.mimeType || '').toString()) && !allowedExt.has(normalizedExt)) {
      throw new BadRequestException('Tip fisier neacceptat. Acceptat: PDF, DOC, DOCX, TXT, ZIP, PPT, PPTX');
    }

    const saved = await this.assignments.saveSubmission(Number(id), body.studentEmail, {
      originalFileName: originalName,
      storedFileName: body.key,
      mimeType: (body.mimeType || 'application/octet-stream').toString(),
      sizeBytes: Number(body.sizeBytes || 0),
    });

    return {
      message: 'Tema trimisa',
      submission: {
        id: saved.id,
        assignmentId: saved.assignment?.id,
        originalFileName: saved.originalFileName,
        mimeType: saved.mimeType,
        sizeBytes: Number(saved.sizeBytes || 0),
        grade: typeof (saved as any).grade === 'number' ? (saved as any).grade : null,
        graded_at: (saved as any).graded_at || null,
        graded_by: (saved as any).graded_by || null,
        created_at: saved.created_at,
      },
    };
  }

  @Patch('submissions/:submissionId/grade')
  @UseGuards(JwtAuthGuard)
  async gradeSubmission(@Param('submissionId') submissionId: string, @Body() body: { graderEmail?: string | null; grade?: number | null }) {
    const saved = await this.assignments.setSubmissionGrade(Number(submissionId), body.graderEmail || null, body.grade === undefined ? null : body.grade);

    return {
      message: 'Nota salvata',
      submission: {
        id: saved.id,
        assignmentId: saved.assignment?.id,
        studentEmail: saved.studentEmail,
        grade: typeof (saved as any).grade === 'number' ? (saved as any).grade : null,
        graded_at: (saved as any).graded_at || null,
        graded_by: (saved as any).graded_by || null,
      },
    };
  }

  @Get('submissions/:submissionId/file')
async download(
  @Param('submissionId') submissionId: string,
  @Res() res: Response,
  @Query('download') download?: string,
) {
    const submission = await this.assignments.getSubmissionById(Number(submissionId));
    if (!submission) throw new NotFoundException('Submission not found');
    const key = submission.storedFileName;
    if (!key) throw new NotFoundException('Fisierul nu mai exista');
    const url = await this.storageService.getPresignedGetUrl(key);
    return res.redirect(url);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    const removed = await this.assignments.remove(Number(id));
    return { removed };
  }
}
