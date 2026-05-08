import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertService } from '../shared/alert.service';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './course-details.html',
  styleUrls: ['./course-details.scss'],
})
export class CourseDetails {
  courseId = 0;
  role: 'professor' | 'student' | null = null;
  canEditCourse = false;
  showCourseMenu = false;
  showAttendanceModal = false;
  attendanceDurationMinutes = 10;
  generatedAttendanceSession: any = null;
  attendanceQrImageUrl = '';
  userEmail = '';
  userName = '';
  loading = false;
  error: string | null = null;

  course: any = null;
  editModel = { title: '', description: '' };
  announceModel = { title: '', content: '' };
  assignmentModel: { title: string; description: string; dueDate: string; kind: 'assignment' | 'material' } = {
    title: '',
    description: '',
    dueDate: '',
    kind: 'assignment',
  };
  inviteEmail = '';
  csvFileName = '';
  csvInviteInProgress = false;
  csvInviteReport: {
    summary: {
      total: number;
      created: number;
      alreadyInvited: number;
      alreadyEnrolled: number;
      invalid: number;
      errors: number;
    };
    results: Array<{ email: string; status: string }>;
  } | null = null;
  private parsedCsvEmails: string[] = [];
  lastInviteEmail = '';
  lastInviteAt = '';
  lastInviteStatus = '';
  showAnnouncementForm = false;
  showAssignmentForm = false;

  announcements: Array<any> = [];
  assignments: Array<any> = [];
  editingAnnouncementId: number | null = null;
  editingAnnouncementModel: { title: string; content: string } = { title: '', content: '' };
  editingAssignmentId: number | null = null;
  editingAssignmentModel: { title: string; description: string; dueDate: string; kind: 'assignment' | 'material' } = {
    title: '',
    description: '',
    dueDate: '',
    kind: 'assignment',
  };
  // menu state for per-item actions (edit/delete) - use composite key to avoid id collisions between types
  itemMenuOpenForId: string | null = null;
  commentDraftByAnnouncement: Record<number, string> = {};
  showCommentFormByAnnouncement: Record<number, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private alerts: AlertService,
  ) {
    this.readUser();
    this.route.queryParamMap.subscribe((params) => {
      const edit = (params.get('edit') || '').toString().toLowerCase();
      this.canEditCourse = this.role === 'professor' && (edit === '1' || edit === 'true');
      this.showCourseMenu = false;
      this.cdr.markForCheck();
    });
    this.route.paramMap.subscribe((params) => {
      this.courseId = Number(params.get('id') || 0);
      if (!this.courseId) {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.loadPage();
    });
  }

  toggleCourseMenu() {
    if (this.role !== 'professor') return;
    this.showCourseMenu = !this.showCourseMenu;
  }

  async generateAttendanceNow() {
    if (this.role !== 'professor') return;
    this.showCourseMenu = false;
    this.showAttendanceModal = true;
    this.generatedAttendanceSession = null;
    this.attendanceQrImageUrl = '';
    this.attendanceDurationMinutes = 5;
    this.cdr.markForCheck();
    await this.createAttendanceSession();
  }

  closeAttendanceModal() {
    this.showAttendanceModal = false;
    this.cdr.markForCheck();
  }

  async createAttendanceSession() {
    if (!this.courseId) return;
    try {
      const res = await fetch(`http://localhost:3000/courses/${this.courseId}/attendance/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: Number(this.attendanceDurationMinutes) || 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Nu se poate crea sesiunea de prezență');
      this.generatedAttendanceSession = data.session || data.session;
      const token = this.generatedAttendanceSession?.token;
      const attendanceUrl = `${location.protocol}//${location.host}/attendance/mark?token=${encodeURIComponent(token)}`;
      this.attendanceQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendanceUrl)}`;
      this.cdr.markForCheck();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  openEditMode() {
    this.showCourseMenu = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: '1' },
      queryParamsHandling: 'merge',
    });
  }

  closeEditMode() {
    this.showCourseMenu = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleAnnouncementForm() {
    this.showAnnouncementForm = !this.showAnnouncementForm;
    if (!this.showAnnouncementForm) {
      this.announceModel = { title: '', content: '' };
    }
  }

  async removeCourse() {
    if (!this.canEditCourse) return;
    if (!confirm('Stergi acest curs?')) return;
    this.loading = true;
    try {
      const res = await fetch(`http://localhost:3000/courses/${this.courseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate sterge cursul');
      this.alerts.success('Curs sters');
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
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
      await Promise.all([
        this.loadCourse(),
        this.loadAnnouncements(),
        this.loadAssignments(),
      ]);
    } catch (err: any) {
      this.error = err?.message || 'Nu se poate încărca pagina cursului';
      this.alerts.error(this.error || 'Nu se poate încărca pagina cursului');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async loadCourse() {
    const res = await fetch(`http://localhost:3000/courses/${this.courseId}`);
    const data = await res.json();
    if (!res.ok || !data?.id) throw new Error(data.message || 'Cursul nu a fost găsit');
    this.course = data;
    this.editModel = {
      title: data.title || '',
      description: data.description || '',
    };
  }

  async loadAnnouncements() {
    const res = await fetch(`http://localhost:3000/announcements?courseId=${this.courseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Nu se pot încărca anunțurile');
    this.announcements = data;
  }

  async loadAssignments() {
    const res = await fetch(`http://localhost:3000/assignments?courseId=${this.courseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Nu se pot incarca temele');
    this.assignments = Array.isArray(data) ? data : [];
  }

  async saveCourse() {
    try {
      const res = await fetch(`http://localhost:3000/courses/${this.courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.editModel),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate salva cursul');
      this.course = { ...this.course, ...data.course };
      this.alerts.success('Curs actualizat');
      this.cdr.markForCheck();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  async sendInvitation() {
    const email = this.inviteEmail.trim();
    if (!email) {
      this.alerts.warning('Introdu email-ul studentului');
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/enrollments/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: email, courseId: this.courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate trimite invitația');
      this.lastInviteEmail = email;
      this.lastInviteAt = new Date().toISOString();
      this.lastInviteStatus = 'trimisa';
      this.inviteEmail = '';
      this.alerts.success('Invitatie trimisa');
      this.cdr.markForCheck();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  async onCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.csvInviteReport = null;
    this.parsedCsvEmails = [];

    if (!file) {
      this.csvFileName = '';
      this.alerts.warning('Selecteaza un fisier CSV.');
      this.cdr.markForCheck();
      return;
    }

    this.csvFileName = file.name;

    try {
      const text = await file.text();
      const tokens = text
        .split(/[\n,;\t\r]+/g)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => !!t);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      this.parsedCsvEmails = Array.from(new Set(tokens.filter((t) => emailRegex.test(t))));

      if (this.parsedCsvEmails.length === 0) {
        this.alerts.warning('Fisierul CSV nu contine emailuri valide.');
      } else {
        this.alerts.info(`CSV incarcat: ${this.parsedCsvEmails.length} email(uri) valide.`);
      }
    } catch {
      this.alerts.error('Nu se poate citi fisierul CSV.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  async sendBulkInvitationsFromCsv() {
    if (this.role !== 'professor') return;
    if (!this.courseId) return;

    if (this.parsedCsvEmails.length === 0) {
      this.alerts.warning('Incarca mai intai un CSV cu emailuri valide.');
      return;
    }

    this.csvInviteInProgress = true;
    this.csvInviteReport = null;

    try {
      const res = await fetch('http://localhost:3000/enrollments/invite/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmails: this.parsedCsvEmails, courseId: this.courseId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Nu se pot trimite invitatiile bulk.');

      this.csvInviteReport = {
        summary: data?.summary || {
          total: 0,
          created: 0,
          alreadyInvited: 0,
          alreadyEnrolled: 0,
          invalid: 0,
          errors: 0,
        },
        results: Array.isArray(data?.results) ? data.results : [],
      };

      this.alerts.success(`Invitatii procesate: ${this.csvInviteReport.summary.created} trimise.`);
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.csvInviteInProgress = false;
      this.cdr.markForCheck();
    }
  }

  async createAnnouncement() {
    const title = this.announceModel.title.trim();
    const content = this.announceModel.content.trim();
    if (!title || !content) {
      this.alerts.warning('Completeaza titlul si continutul');
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: this.courseId, title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate crea anunțul');
      this.announceModel = { title: '', content: '' };
      this.showAnnouncementForm = false;
      await this.loadAnnouncements();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  toggleAssignmentForm() {
    this.showAssignmentForm = !this.showAssignmentForm;
    if (!this.showAssignmentForm) {
      this.assignmentModel = { title: '', description: '', dueDate: '', kind: 'assignment' };
    }
  }

  async createAssignment() {
    const title = this.assignmentModel.title.trim();
    const description = this.assignmentModel.description.trim();
    const dueDate = this.assignmentModel.dueDate.trim();
    const kind = this.assignmentModel.kind;

    if (!title || !description) {
      this.alerts.warning('Completeaza titlul si cerinta temei');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: this.courseId,
          title,
          description,
          dueDate: kind === 'assignment' ? dueDate || null : null,
          kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate crea tema');
      this.assignmentModel = { title: '', description: '', dueDate: '', kind: 'assignment' };
      this.showAssignmentForm = false;
      await this.loadAssignments();
      this.alerts.success('Tema a fost adaugata');
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  async removeAssignment(id: number) {
    if (!confirm('Stergi aceasta tema?')) return;
    try {
      const res = await fetch(`http://localhost:3000/assignments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.removed) throw new Error(data.message || 'Nu se poate sterge tema');
      await this.loadAssignments();
      this.alerts.success('Tema stearsa');
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  startEditAssignment(item: any) {
    if (this.role !== 'professor') return;
    this.editingAssignmentId = item.id;
    this.editingAssignmentModel = {
      title: item.title || '',
      description: item.description || item.content || '',
      dueDate: item.due_at ? String(item.due_at).slice(0,10) : '',
      kind: item.kind === 'material' ? 'material' : 'assignment',
    };
    this.cdr.markForCheck();
  }

  cancelEditAssignment() {
    this.editingAssignmentId = null;
    this.editingAssignmentModel = { title: '', description: '', dueDate: '', kind: 'assignment' };
    this.cdr.markForCheck();
  }

  async saveAssignment(id: number) {
    if (!this.editingAssignmentId || this.editingAssignmentId !== id) return;
    const title = (this.editingAssignmentModel.title || '').trim();
    const description = (this.editingAssignmentModel.description || '').trim();
    const dueDate = (this.editingAssignmentModel.dueDate || '').trim();
    const kind = this.editingAssignmentModel.kind;
    if (!title || !description) { this.alerts.warning('Completează titlul și conținutul'); return; }
    try {
      const res = await fetch(`http://localhost:3000/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, dueDate: kind === 'assignment' ? (dueDate || null) : null, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate actualiza tema');
      this.alerts.success('Tema actualizată');
      this.editingAssignmentId = null;
      await this.loadAssignments();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.cdr.markForCheck();
    }
  }

  toggleItemMenu(item: any, event?: Event) {
    if (event) event.stopPropagation();
    const key = `${item.type}-${item.id}`;
    this.itemMenuOpenForId = this.itemMenuOpenForId === key ? null : key;
    this.cdr.markForCheck();
  }

  closeItemMenu() {
    this.itemMenuOpenForId = null;
    this.cdr.markForCheck();
  }

  async removeAnnouncement(id: number) {
    if (!confirm('Ștergi acest anunț?')) return;
    try {
      const res = await fetch(`http://localhost:3000/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.removed) throw new Error(data.message || 'Nu se poate șterge anunțul');
      await this.loadAnnouncements();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  startEditAnnouncement(item: any) {
    if (this.role !== 'professor') return;
    this.editingAnnouncementId = item.id;
    this.editingAnnouncementModel = { title: item.title || '', content: item.content || '' };
    this.cdr.markForCheck();
  }

  cancelEditAnnouncement() {
    this.editingAnnouncementId = null;
    this.editingAnnouncementModel = { title: '', content: '' };
    this.cdr.markForCheck();
  }

  async saveAnnouncement(id: number) {
    if (!this.editingAnnouncementId || this.editingAnnouncementId !== id) return;
    const title = (this.editingAnnouncementModel.title || '').trim();
    const content = (this.editingAnnouncementModel.content || '').trim();
    if (!title || !content) { this.alerts.warning('Completează titlul și conținutul'); return; }
    try {
      const res = await fetch(`http://localhost:3000/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate actualiza anunțul');
      this.alerts.success('Anunț actualizat');
      this.editingAnnouncementId = null;
      await this.loadAnnouncements();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.cdr.markForCheck();
    }
  }

  async addAnnouncementComment(announcementId: number) {
    if (this.role !== 'student') return;

    const content = (this.commentDraftByAnnouncement[announcementId] || '').trim();
    if (!content) {
      this.alerts.warning('Scrie un comentariu inainte sa trimiti.');
      return;
    }

    if (!this.userName) {
      this.alerts.error('Nu esti autentificat.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/announcements/${announcementId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: this.userName, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Nu se poate adauga comentariul');

      this.commentDraftByAnnouncement[announcementId] = '';
      this.showCommentFormByAnnouncement[announcementId] = false;
      await this.loadAnnouncements();
      this.alerts.success('Comentariu adaugat.');
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.cdr.markForCheck();
    }
  }

  toggleCommentForm(announcementId: number) {
    this.showCommentFormByAnnouncement[announcementId] = true;
  }

  autoResizeTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  commentsSummaryText(count: number) {
    if (count === 1) return 'Un comentariu la curs';
    if (count === 2) return 'Doua comentarii la curs';
    return `${count} comentarii la curs`;
  }

  get feedItems(): Array<any> {
    const announcementItems = (this.announcements || []).map((item) => ({
      ...item,
      type: 'announcement' as const,
    }));

    const assignmentItems = (this.assignments || []).map((item) => ({
      ...item,
      type: 'assignment' as const,
      kind: item.kind === 'material' ? 'material' : 'assignment',
    }));

    return [...announcementItems, ...assignmentItems].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
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

  trackById(_: number, item: any) {
    return item.id;
  }

  trackByFeed(_: number, item: any) {
    return `${item.type}-${item.id}`;
  }

  openAssignmentFromCard(item: any, event?: Event) {
    if (!item || item.type !== 'assignment') return;

    const target = event?.target as HTMLElement | null;
    if (target) {
      const interactive = target.closest('button, a, input, textarea, select, label');
      if (interactive) return;
    }

    this.router.navigate(['/dashboard/course', this.courseId, 'assignment', item.id]);
  }

  trackByEmail(_: number, item: { email: string; status: string }) {
    return `${item.email}-${item.status}`;
  }
}
