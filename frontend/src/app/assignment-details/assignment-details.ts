import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertService } from '../shared/alert.service';

@Component({
  selector: 'app-assignment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './assignment-details.html',
  styleUrls: ['./assignment-details.scss'],
})
export class AssignmentDetails {
  courseId = 0;
  assignmentId = 0;
  role: 'professor' | 'student' | null = null;
  userEmail = '';
  userName = '';

  loading = false;
  error: string | null = null;

  assignment: any = null;
  selectedFile: File | null = null;
  submitInProgress = false;
  mySubmission: any = null;
  submissions: Array<any> = [];
  allComments: Array<any> = [];
  selectedStudentForComment: string | null = null;

  comments: Array<any> = [];
  commentDraft = '';
  sendCommentInProgress = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private alerts: AlertService,
  ) {
    this.readUser();
    this.route.paramMap.subscribe((params) => {
      this.courseId = Number(params.get('courseId') || 0);
      this.assignmentId = Number(params.get('assignmentId') || 0);
      if (!this.courseId || !this.assignmentId) {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.loadPage();
    });
  }

  private readUser() {
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.userEmail = parsed?.email || '';
      this.userName = parsed?.username || parsed?.email || '';
      const roleStr = (parsed?.role || 'student').toString().toLowerCase();
      if (roleStr.includes('prof') || roleStr.includes('teacher') || roleStr.includes('lecturer')) {
        this.role = 'professor';
      } else {
        this.role = 'student';
      }
    } catch {}
  }

  async loadPage() {
    this.loading = true;
    this.error = null;
    try {
      const tasks: Promise<any>[] = [this.loadAssignment()];
      if (this.role === 'student') {
        tasks.push(this.loadComments());
        tasks.push(this.loadMySubmission());
      } else if (this.role === 'professor') {
        tasks.push(this.loadAllSubmissions());
        tasks.push(this.loadAllComments());
      }
      await Promise.all(tasks);
    } catch (err: any) {
      this.error = err?.message || 'Nu se poate incarca tema';
      this.alerts.error(this.error || 'Nu se poate incarca tema');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async loadAllSubmissions() {
    const res = await fetch(`/api/assignments/${this.assignmentId}/submissions`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((data && data.message) || 'Nu se pot incarca predarile');
    this.submissions = Array.isArray(data) ? data : [];
    if (this.role === 'professor' && !this.selectedStudentForComment && this.submissions.length > 0) {
      this.selectedStudentForComment = this.submissions[0].studentEmail || null;
    }
  }

  async loadAllComments() {
    const res = await fetch(`/api/assignments/${this.assignmentId}/comments/all`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((data && data.message) || 'Nu se pot incarca comentariile');
    this.allComments = Array.isArray(data) ? data : [];
    if (this.allComments.length > 0) {
      this.selectedStudentForComment = this.allComments[0].studentEmail || null;
    } else if (this.submissions.length > 0) {
      this.selectedStudentForComment = this.submissions[0].studentEmail || null;
    }
  }

  async loadAssignment() {
    const res = await fetch(`/api/assignments/${this.assignmentId}`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok || !data?.id) throw new Error((data && data.message) || 'Tema nu a fost gasita');
    this.assignment = data;
  }

  async loadMySubmission() {
    if (!this.userEmail) return;
    const res = await fetch(
      `/api/assignments/${this.assignmentId}/submissions/mine?studentEmail=${encodeURIComponent(this.userEmail)}`,
    );
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((data && data.message) || 'Nu se poate incarca predarea');
    this.mySubmission = data || null;
  }

  async loadComments() {
    if (!this.userEmail) return;
    const res = await fetch(
      `/api/assignments/${this.assignmentId}/comments?studentEmail=${encodeURIComponent(this.userEmail)}`,
    );
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((data && data.message) || 'Nu se pot incarca comentariile');
    this.comments = Array.isArray(data) ? data : [];
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input?.files?.[0] || null;
  }

  async submitFile() {
    if (!this.userEmail) {
      this.alerts.error('Nu esti autentificat');
      return;
    }
    if (!this.selectedFile) {
      this.alerts.warning('Alege mai intai un fisier');
      return;
    }
    if (this.isPastDeadline) {
      this.alerts.error('Termenul a expirat: nu se mai pot trimite teme');
      return;
    }

    this.submitInProgress = true;
    try {
      const form = new FormData();
      form.append('studentEmail', this.userEmail);
      form.append('file', this.selectedFile);

      const res = await fetch(`/api/assignments/${this.assignmentId}/submissions`, {
        method: 'POST',
        body: form,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || 'Nu se poate trimite fisierul');

      this.mySubmission = (data && data.submission) ? data.submission : null;
      this.selectedFile = null;
      this.alerts.success('Fisier trimis cu succes');
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.submitInProgress = false;
      this.cdr.markForCheck();
    }
  }

  async sendPrivateComment() {
    const content = (this.commentDraft || '').trim();
    if (!content) {
      this.alerts.warning('Scrie un comentariu inainte sa trimiti');
      return;
    }
    if (!this.userEmail || !this.userName) {
      this.alerts.error('Nu esti autentificat');
      return;
    }

    this.sendCommentInProgress = true;
    try {
      const targetStudent = this.role === 'professor' ? (this.selectedStudentForComment || '') : this.userEmail;
      if (this.role === 'professor' && !targetStudent) {
        throw new Error('Selectează mai întâi un student pentru comentariu');
      }

      const res = await fetch(`/api/assignments/${this.assignmentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: targetStudent,
          authorName: this.userName,
          authorRole: this.role === 'professor' ? 'professor' : 'student',
          content,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || 'Nu se poate adauga comentariul');

      this.commentDraft = '';
      if (this.role === 'professor') {
        await this.loadAllComments();
      } else {
        await this.loadComments();
      }
      this.alerts.success('Comentariu trimis');
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.sendCommentInProgress = false;
      this.cdr.markForCheck();
    }
  }

  formatShortDate(value?: string | Date | null) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const day = date.getDate();
    const month = months[date.getMonth()] || '';
    return `${day} ${month}`;
  }

  formatDeadline(value?: string | Date | null) {
    if (!value) return '';
    // Parse date safely: accept date-only 'YYYY-MM-DD' or full ISO
    let date: Date;
    try {
      const s = String(value);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        date = new Date(y, mo, d);
      } else {
        date = new Date(s);
      }
    } catch {
      return '';
    }
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getDate();
    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months[date.getMonth()] || '';
    return `${day} ${month} • 23:59`;
  }

  get isPastDeadline(): boolean {
    const due = this.assignment?.due_at;
    if (!due) return false;
    try {
      const s = String(due);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let d: Date;
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const day = Number(m[3]);
        d = new Date(y, mo, day, 23, 59, 59, 999);
      } else {
        const parsed = new Date(s);
        if (Number.isNaN(parsed.getTime())) return false;
        d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
      }
      return Date.now() > d.getTime();
    } catch {
      return false;
    }
  }

  trackById(_: number, item: any) {
    return item.id;
  }

  autoResizeTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  get studentEmails(): string[] {
    const fromSubs = (this.submissions || []).map((s) => s.studentEmail || '');
    const fromComments = (this.allComments || []).map((c) => c.studentEmail || '');
    const set = new Set<string>([...fromSubs, ...fromComments].filter(Boolean));
    return Array.from(set);
  }

  get displayedComments(): any[] {
    if (this.role === 'professor') {
      if (!this.selectedStudentForComment) return [];
      return (this.allComments || []).filter((c) => c.studentEmail === this.selectedStudentForComment);
    }
    return this.comments || [];
  }
}
