import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlertService } from '../shared/alert.service';
import { Avatar } from '../shared/avatar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Avatar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  role: 'professor' | 'student' | null = null;
  username = '';

  // professor
  showAddCourseForm = false;
  courseTitle = '';
  courseDescription = '';

  // shared
  loading = false;
  error: string | null = null;
  coursesList: Array<any> = [];

  // student only
  invitations: Array<any> = [];
  enrolledCourses: Array<any> = [];

  constructor(private cdr: ChangeDetectorRef, private router: Router, private alerts: AlertService) {
    this.readUser();
    this.loadData();

    window.addEventListener('auth:login', (e: any) => {
      this.readUser();
      this.loadData();
    });
    window.addEventListener('auth:logout', () => {
      this.role = null;
      this.username = '';
      this.coursesList = [];
      this.invitations = [];
      this.enrolledCourses = [];
      this.cdr.markForCheck();
    });
  }

  private readUser() {
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.username = parsed?.username || '';
      const r = (parsed?.role || 'student').toString().toLowerCase();
      if (r === 'admin') {
        this.role = null;
        this.router.navigate(['/admin']);
        return;
      }
      this.role = r === 'professor' ? 'professor' : 'student';
    } catch {}
  }

  private getUserEmail(): string | null {
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (!raw) return null;
      return JSON.parse(raw)?.email || null;
    } catch {
      return null;
    }
  }

  async loadData() {
    if (this.role === 'professor') {
      await this.loadProfessorCourses();
    } else if (this.role === 'student') {
      await Promise.all([this.loadInvitations(), this.loadEnrolledCourses()]);
    }
  }

  // ── PROFESSOR ──────────────────────────────────────────────

  async loadProfessorCourses() {
    const email = this.getUserEmail();
    if (!email) { this.coursesList = []; return; }
    this.loading = true;
    this.error = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `/api/courses/by?professorEmail=${encodeURIComponent(email)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load courses');
      this.coursesList = data;
    } catch (err: any) {
      if (err?.name === 'AbortError') this.error = 'Request timed out';
      else this.error = err?.message || 'Network error';
      this.alerts.error(this.error || 'Network error');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async addCourse() {
    const title = (this.courseTitle || '').trim();
    const description = (this.courseDescription || '').trim();
    if (!title) {
      this.alerts.warning('Introdu un titlu');
      return;
    }
    const email = this.getUserEmail();
    if (!email) {
      this.alerts.error('Nu esti autentificat');
      return;
    }
    this.loading = true;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, professorEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create course');
      this.courseTitle = '';
      this.courseDescription = '';
      this.showAddCourseForm = false;
      await this.loadProfessorCourses();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  toggleAddCourseForm() {
    this.showAddCourseForm = !this.showAddCourseForm;
  }

  cancelAddCourse() {
    this.showAddCourseForm = false;
    this.courseTitle = '';
    this.courseDescription = '';
  }

  // ── STUDENT ────────────────────────────────────────────────

  async loadInvitations() {
    const email = this.getUserEmail();
    if (!email) { this.invitations = []; return; }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `/api/enrollments/invitations?email=${encodeURIComponent(email)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!res.ok) return;
      this.invitations = await res.json();
    } catch {
      this.invitations = [];
    } finally {
      this.cdr.markForCheck();
    }
  }

  async loadEnrolledCourses() {
    const email = this.getUserEmail();
    if (!email) { this.enrolledCourses = []; return; }
    this.loading = true;
    this.error = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `/api/enrollments/enrolled?email=${encodeURIComponent(email)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load courses');
      this.enrolledCourses = data;
    } catch (err: any) {
      if (err?.name === 'AbortError') this.error = 'Request timed out';
      else this.error = err?.message || 'Network error';
      this.alerts.error(this.error || 'Network error');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async acceptInvitation(id: number) {
    const email = this.getUserEmail();
    if (!email) return;
    try {
      const res = await fetch(`/api/enrollments/${id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: email }),
      });
      if (!res.ok) { const d = await res.json(); this.alerts.error(d.message || 'Error'); return; }
      await Promise.all([this.loadInvitations(), this.loadEnrolledCourses()]);
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  async declineInvitation(id: number) {
    const email = this.getUserEmail();
    if (!email) return;
    try {
      const res = await fetch(`/api/enrollments/${id}/decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: email }),
      });
      if (!res.ok) { const d = await res.json(); this.alerts.error(d.message || 'Error'); return; }
      await this.loadInvitations();
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    }
  }

  openCourse(id: number) {
    if (!id) return;
    this.router.navigate(['/dashboard/course', id]);
  }
}
