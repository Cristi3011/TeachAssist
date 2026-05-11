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
  attendanceLink = '';
  countdownText = '';
  private attendanceCountdownInterval: any = null;
  private regeneratingToken = false;
  attendeesForSession: Array<{ studentEmail: string; created_at: string; metadata?: any }> = [];
  private attendancePollInterval: any = null;
  showCreateMenu = false;
  showAttendanceHistoryModal = false;
  attendanceHistory: Array<any> = [];
  selectedSession: any = null;
  viewMode: 'list' | 'details' = 'list';
  userEmail = '';
  userName = '';
  loading = false;
  error: string | null = null;

  course: any = null;
  editModel = { title: '', description: '' };
  announceModel: { title: string; content: string; resourceUrl?: string } = { title: '', content: '', resourceUrl: '' };
  assignmentModel: { title: string; description: string; dueDate: string; kind: 'assignment' | 'material' } = {
    title: '',
    description: '',
    dueDate: '',
    kind: 'assignment',
  };
  
  onAssignmentFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    (this.assignmentModel as any).resourceFile = file;
  }
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
  editingAnnouncementModel: { title: string; content: string; resourceUrl?: string } = { title: '', content: '', resourceUrl: '' };
  editingAssignmentId: number | null = null;
  editingAssignmentModel: { title: string; description: string; dueDate: string; kind: 'assignment' | 'material' } = {
    title: '',
    description: '',
    dueDate: '',
    kind: 'assignment',
  };
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
    if (this.attendanceCountdownInterval) {
      clearInterval(this.attendanceCountdownInterval);
      this.attendanceCountdownInterval = null;
    }
    if (this.attendancePollInterval) {
      clearInterval(this.attendancePollInterval);
      this.attendancePollInterval = null;
    }
    this.cdr.markForCheck();
  }

  async createAttendanceSession() {
    if (!this.courseId) return;
    try {
      // try to find an existing session for the current hour and reuse it
      const hourStart = new Date();
      hourStart.setMinutes(0, 0, 0);
      hourStart.setMilliseconds(0);

      let created: any = null;
      try {
        const listRes = await fetch(`/api/courses/${this.courseId}/sessions`);
        const listData = await listRes.json();
        if (listRes.ok && Array.isArray(listData)) {
          const found = listData.find((s: any) => {
            const sStart = new Date(s.startTime || s.sessionStart || s.start || s.sessionStartTime || s.startTime);
            return !isNaN(sStart.getTime()) && sStart.getTime() === hourStart.getTime();
          });
          if (found) created = found;
        }
      } catch (err) {
        // ignore listing errors and fall back to creating a session
      }

      if (!created) {
        const res = await fetch(`/api/courses/${this.courseId}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Nu se poate crea sesiunea de prezență');
        created = data.session;
      }

      const openRes = await fetch(`/api/sessions/${created.id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: Number(this.attendanceDurationMinutes) || 10 }),
      });
      const openData = await openRes.json();
      if (!openRes.ok) throw new Error(openData?.message || 'Nu se poate deschide sesiunea de prezență');

      this.generatedAttendanceSession = {
        ...created,
        qrToken: openData.token,
        qrExpiresAt: openData.qrExpiresAt || openData.expiresAt || null,
        sessionStart: openData.sessionStart || null,
        sessionEnd: openData.sessionEnd || null,
      };

      let endsAt = new Date(this.generatedAttendanceSession.qrExpiresAt || this.generatedAttendanceSession.sessionEnd || Date.now()).getTime();

      if (this.attendanceCountdownInterval) {
        clearInterval(this.attendanceCountdownInterval);
      }

      const updateCountdown = () => {
        const now = Date.now();
        const diff = endsAt - now;

        if (diff <= 0) {
          if (!this.regeneratingToken) {
            this.regeneratingToken = true;
            this.countdownText = 'Regenerare cod...';
            this.cdr.markForCheck();
            this.regenerateSessionToken(created.id).then((newEnds) => {
              if (newEnds) {
                endsAt = newEnds;
              }
            }).catch(() => {}).finally(() => {
              this.regeneratingToken = false;
            });
          }
          return;
        }

        const minutes = Math.floor(diff / 1000 / 60);
        const seconds = Math.floor((diff / 1000) % 60);

        this.countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.cdr.markForCheck();
      };

      updateCountdown();

      this.attendanceCountdownInterval = setInterval(updateCountdown, 1000);
      const token = this.generatedAttendanceSession?.qrToken;
      let hostToUse = location.hostname;
      const unreachablePrefix = '192.168.56.';
      if (hostToUse.startsWith(unreachablePrefix) || hostToUse === 'localhost' || hostToUse === '127.0.0.1') {
        try {
          const hint = hostToUse.startsWith(unreachablePrefix) ? '' : hostToUse;
          const answer = window.prompt('Introdu IP-ul vizibil pe rețea (ex: 192.168.1.132) pentru link-ul QR (lasă gol pentru a folosi ' + hostToUse + '):', hint || '');
          if (answer && answer.trim()) hostToUse = answer.trim();
        } catch {}
      }
      const portPart = location.port ? `:${location.port}` : '';
      const attendanceUrl = `${location.protocol}//${hostToUse}${portPart}/attendance/mark?token=${encodeURIComponent(token)}`;
      this.attendanceLink = attendanceUrl;
      this.attendanceQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendanceUrl)}`;
      this.cdr.markForCheck();

      // load attendees immediately and poll while session active
      if (created?.id) {
        this.loadAttendees(created.id);
        if (this.attendancePollInterval) clearInterval(this.attendancePollInterval);
        this.attendancePollInterval = setInterval(() => this.loadAttendees(created.id), 5000);
      }
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  async openAttendanceHistory() {
    if (!this.courseId) return;
    try {
      const res = await fetch(`/api/courses/${this.courseId}/sessions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Nu se pot prelua sesiunile');
      this.attendanceHistory = Array.isArray(data) ? data : [];
      this.viewMode = 'list';
      this.selectedSession = null;
      this.showAttendanceHistoryModal = true;
      this.cdr.markForCheck();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  closeAttendanceHistoryModal() {
    this.showAttendanceHistoryModal = false;
    this.viewMode = 'list';
    this.selectedSession = null;
    this.cdr.markForCheck();
  }

  async viewSessionDetails(sessionId: number) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Nu se pot prelua participanții');
      this.selectedSession = { id: sessionId, attendees: Array.isArray(data) ? data : [] };
      this.viewMode = 'details';
      this.cdr.markForCheck();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  backToAttendanceList() {
    this.viewMode = 'list';
    this.selectedSession = null;
    this.cdr.markForCheck();
  }

  private async regenerateSessionToken(sessionId: number): Promise<number | null> {
    try {
      const openRes = await fetch(`/api/sessions/${sessionId}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: Number(this.attendanceDurationMinutes) || 10 }),
      });
      const openData = await openRes.json();
      if (!openRes.ok) throw new Error(openData?.message || 'Nu se poate regenera codul');

      // update token and endTime
      this.generatedAttendanceSession = {
        ...this.generatedAttendanceSession,
        qrToken: openData.token,
        qrExpiresAt: openData.qrExpiresAt || openData.expiresAt || null,
        sessionStart: openData.sessionStart || this.generatedAttendanceSession.sessionStart || null,
        sessionEnd: openData.sessionEnd || this.generatedAttendanceSession.sessionEnd || null,
      };
      const token = this.generatedAttendanceSession?.qrToken;
      let hostToUse = location.hostname;
      const unreachablePrefix = '192.168.56.';
      if (hostToUse.startsWith(unreachablePrefix) || hostToUse === 'localhost' || hostToUse === '127.0.0.1') {
        try {
          const hint = hostToUse.startsWith(unreachablePrefix) ? '' : hostToUse;
          const answer = window.prompt('Introdu IP-ul vizibil pe rețea (ex: 192.168.1.132) pentru link-ul QR (lasă gol pentru a folosi ' + hostToUse + '):', hint || '');
          if (answer && answer.trim()) hostToUse = answer.trim();
        } catch {}
      }
      const portPart = location.port ? `:${location.port}` : '';
      const attendanceUrl = `${location.protocol}//${hostToUse}${portPart}/attendance/mark?token=${encodeURIComponent(token)}`;
      this.attendanceLink = attendanceUrl;
      this.attendanceQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendanceUrl)}`;

      return new Date(openData.qrExpiresAt || openData.expiresAt).getTime();
    } catch (err: any) {
      console.warn('Failed to regenerate token', err?.message || err);
      this.countdownText = 'Eroare la regenerare';
      this.cdr.markForCheck();
      return null;
    }
  }

  async loadAttendees(sessionId: number) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Nu se pot prelua prezențele');
      this.attendeesForSession = Array.isArray(data) ? data : [];
      this.cdr.markForCheck();
    } catch (err: any) {
      console.warn('Could not load attendees', err?.message || err);
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
      this.announceModel = { title: '', content: '', resourceUrl: '' } as any;
    }
  }

  toggleCreateMenu() {
    this.showCreateMenu = !this.showCreateMenu;
    if (this.showCreateMenu) this.showCourseMenu = false;
  }

  openAnnouncementForm() {
    this.showCreateMenu = false;
    this.showAnnouncementForm = true;
    this.showAssignmentForm = false;
    this.announceModel = { title: '', content: '', resourceUrl: '' } as any;
    this.cdr.markForCheck();
  }

  openAssignmentForm(kind: 'assignment' | 'material') {
    this.showCreateMenu = false;
    this.showAssignmentForm = true;
    this.showAnnouncementForm = false;
    this.assignmentModel = { title: '', description: '', dueDate: '', kind };
    this.cdr.markForCheck();
  }

  async removeCourse() {
    if (!this.canEditCourse) return;
    if (!confirm('Stergi acest curs?')) return;
    this.loading = true;
    try {
      const res = await fetch(`/api/courses/${this.courseId}`, { method: 'DELETE' });
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
    const res = await fetch(`/api/courses/${this.courseId}`);
    const data = await res.json();
    if (!res.ok || !data?.id) throw new Error(data.message || 'Cursul nu a fost găsit');
    this.course = data;
    this.editModel = {
      title: data.title || '',
      description: data.description || '',
    };
  }

  async loadAnnouncements() {
    const res = await fetch(`/api/announcements?courseId=${this.courseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Nu se pot încărca anunțurile');
    this.announcements = data;
  }

  async loadAssignments() {
    const res = await fetch(`/api/assignments?courseId=${this.courseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Nu se pot incarca temele');
    this.assignments = Array.isArray(data) ? data : [];
    try {
      console.debug('loadAssignments -> assignments', this.assignments);
    } catch {}
  }

  async saveCourse() {
    try {
      const res = await fetch(`/api/courses/${this.courseId}`, {
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
      const res = await fetch('/api/enrollments/invite', {
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
      const res = await fetch('/api/enrollments/invite/bulk', {
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
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: this.courseId, title, content, resourceUrl: (this.announceModel as any).resourceUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate crea anunțul');
      this.announceModel = { title: '', content: '', resourceUrl: '' } as any;
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
      const res = await fetch('/api/assignments', {
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
      const created = data?.assignment || data;
      try { console.debug('createAssignment -> created', created); } catch {}

      if (kind === 'material' && (this.assignmentModel as any).resourceFile && created?.id) {
        try {
          const form = new FormData();
          form.append('file', (this.assignmentModel as any).resourceFile);
          const backendBase = `http://localhost:3000`;
          const uploadUrl = `${backendBase}/assignments/${created.id}/resource`;
          const upRes = await fetch(uploadUrl, {
            method: 'POST',
            body: form,
          });
          const upText = await upRes.text();
          const upData = upText ? JSON.parse(upText) : null;
          if (!upRes.ok) {
            console.warn('Failed to upload material', upData?.message || upData);
            this.alerts.warning('Materialul nu a putut fi încărcat pe server');
          }
        } catch (err: any) {
          console.warn('Material upload failed', err?.message || err);
          this.alerts.warning('Eroare la upload material: ' + (err?.message || 'network'));
        }
      }

      this.assignmentModel = { title: '', description: '', dueDate: '', kind: 'assignment' };
      try { (this.assignmentModel as any).resourceFile = null; } catch {}
      this.showAssignmentForm = false;
      await this.loadAssignments();
      this.alerts.success(kind === 'material' ? 'Materialul a fost adaugat' : 'Tema a fost adaugata');
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  async removeAssignment(id: number) {
    const item = this.assignments?.find((a: any) => a.id === id) || null;
    const isMaterial = item?.kind === 'material';
    if (!confirm(isMaterial ? 'Stergi acest material?' : 'Stergi aceasta tema?')) return;
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.removed) throw new Error(data.message || (isMaterial ? 'Nu se poate sterge materialul' : 'Nu se poate sterge tema'));
      await this.loadAssignments();
      this.alerts.success(isMaterial ? 'Materialul sters' : 'Tema stearsa');
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
      const res = await fetch(`/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, dueDate: kind === 'assignment' ? (dueDate || null) : null, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nu se poate actualiza tema');
      this.alerts.success(kind === 'material' ? 'Materialul actualizat' : 'Tema actualizata');
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
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
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
    this.editingAnnouncementModel = { title: item.title || '', content: item.content || '', resourceUrl: (item as any).resourceUrl || '' } as any;
    this.cdr.markForCheck();
  }

  cancelEditAnnouncement() {
    this.editingAnnouncementId = null;
    this.editingAnnouncementModel = { title: '', content: '', resourceUrl: '' } as any;
    this.cdr.markForCheck();
  }

  async saveAnnouncement(id: number) {
    if (!this.editingAnnouncementId || this.editingAnnouncementId !== id) return;
    const title = (this.editingAnnouncementModel.title || '').trim();
    const content = (this.editingAnnouncementModel.content || '').trim();
    if (!title || !content) { this.alerts.warning('Completează titlul și conținutul'); return; }
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, resourceUrl: (this.editingAnnouncementModel as any).resourceUrl || null }),
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
      const res = await fetch(`/api/announcements/${announcementId}/comments`, {
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
