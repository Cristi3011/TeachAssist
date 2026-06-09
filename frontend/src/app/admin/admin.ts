import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/alert.service';

type AdminUser = {
  username: string;
  email: string;
  role: string;
};

type AdminCourse = {
  id: number;
  title: string;
  description: string;
  professor: string;
};

type AdminInvitation = {
  email: string;
  role: 'student' | 'professor';
  used: boolean;
  created_at: string;
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
})
export class Admin {
  userRole = '';
  username = '';
  users: AdminUser[] = [];
  loadingUsers = false;
  usersError = '';
  courses: AdminCourse[] = [];
  loadingCourses = false;
  coursesError = '';
  invitations: AdminInvitation[] = [];
  loadingInvitations = false;
  invitationsLoadError = '';
  invitationActionError = '';
  inviteEmail = '';
  inviteRole: 'student' | 'professor' = 'student';
  inviteSubmitting = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private alerts: AlertService) {
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.userRole = (parsed?.role || '').toString().toLowerCase();
      this.username = parsed?.username || '';

      if (this.isAdmin) {
        void Promise.all([
          this.loadInvitations(),
          this.loadUsers(),
          this.loadCourses(),
        ]);
      }
    } catch {}
  }

  get isAdmin() {
    return this.userRole === 'admin';
  }

  private async loadUsers() {
    this.loadingUsers = true;
    this.usersError = '';

    try {
      const data = await firstValueFrom(this.http.get<any[]>('/api/users'));
      const users = Array.isArray(data) ? data : [];

      this.users = users.map((u: any) => ({
        username: (u?.username || '').toString(),
        email: (u?.email || '').toString(),
        role: (u?.role || '').toString().toLowerCase(),
      }));
    } catch (err) {
      this.usersError = this.getErrorMessage(err, 'Eroare la incarcarea utilizatorilor.');
      this.alerts.error(this.usersError);
    } finally {
      this.loadingUsers = false;
      this.requestRender();
    }
  }

  private async loadCourses() {
    this.loadingCourses = true;
    this.coursesError = '';

    try {
      const data = await firstValueFrom(this.http.get<any[]>('/api/courses'));
      const courses = Array.isArray(data) ? data : [];

      this.courses = courses.map((c: any) => ({
        id: Number(c?.id || 0),
        title: (c?.title || '').toString(),
        description: (c?.description || '').toString(),
        professor: (c?.professor?.username || c?.professor?.email || '').toString(),
      }));
    } catch (err) {
      this.coursesError = this.getErrorMessage(err, 'Eroare la incarcarea cursurilor.');
      this.alerts.error(this.coursesError);
    } finally {
      this.loadingCourses = false;
      this.requestRender();
    }
  }

  async addInvitation() {
    const email = (this.inviteEmail || '').toString().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.invitationActionError = 'Introdu un email valid pentru invitatie.';
      this.alerts.warning(this.invitationActionError);
      this.requestRender();
      return;
    }

    this.inviteSubmitting = true;
    this.invitationActionError = '';

    try {
      const data = await firstValueFrom(this.http.post<any>('/api/invitations', { email, role: this.inviteRole }));

      this.invitations.unshift({
        email,
        role: this.inviteRole,
        used: false,
        created_at: new Date().toISOString(),
      });

      if (data?.invitation?.created_at) {
        this.invitations[0].created_at = data.invitation.created_at;
      }

      this.inviteEmail = '';
      this.alerts.success('Invitatia a fost creata.');
    } catch (err) {
      this.invitationActionError = this.getErrorMessage(err, 'Eroare la creare invitatie.');
      this.alerts.error(this.invitationActionError);
    } finally {
      this.inviteSubmitting = false;
      this.requestRender();
    }
  }

  async removeInvitation(email: string) {
    if (!email) return;
    const confirmed = confirm(`Stergi invitatia pentru ${email}?`);
    if (!confirmed) return;

    this.invitationActionError = '';
    try {
      await firstValueFrom(this.http.delete('/api/invitations', { body: { email } }));

      await this.loadInvitations();
      this.alerts.success('Invitatia a fost stearsa.');
    } catch (err) {
      this.invitationActionError = this.getErrorMessage(err, 'Eroare la stergere invitatie.');
      this.alerts.error(this.invitationActionError);
      this.requestRender();
    }
  }

  async removeUser(email: string) {
    if (!email) return;
    if (email === this.username) {
      this.alerts.warning('Nu poți șterge propriul cont.');
      return;
    }
    const confirmed = confirm(`Stergi utilizatorul ${email}?`);
    if (!confirmed) return;

    try {
      let res: any = null;
      try {
        res = await firstValueFrom(this.http.delete<any>(`/api/users?email=${encodeURIComponent(email)}`));
      } catch (e) {
        res = await firstValueFrom(this.http.delete<any>('/api/users', { body: { email } }));
      }
      if (!res?.ok && res?.message) throw new Error(res.message || 'Could not delete user');
      await this.loadUsers();
      this.alerts.success('Utilizatorul a fost sters.');
    } catch (err) {
      const msg = this.getErrorMessage(err, 'Eroare la stergerea utilizatorului.');
      this.alerts.error(msg);
      this.requestRender();
    }
  }

  private async loadInvitations() {
    this.loadingInvitations = true;
    this.invitationsLoadError = '';

    try {
      const data = await firstValueFrom(this.http.get<any[]>('/api/invitations'));
      const list = Array.isArray(data) ? data : [];

      this.invitations = list.map((i: any) => ({
        email: (i?.email || '').toString(),
        role: ((i?.role || 'student').toString().toLowerCase() === 'professor' ? 'professor' : 'student'),
        used: !!i?.used,
        created_at: (i?.created_at || '').toString(),
      }));
    } catch (err) {
      this.invitationsLoadError = this.getErrorMessage(err, 'Eroare la incarcarea invitatiilor.');
      this.alerts.error(this.invitationsLoadError);
    } finally {
      this.loadingInvitations = false;
      this.requestRender();
    }
  }

  private requestRender() {
    try {
      this.cdr.detectChanges();
    } catch {}
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const serverMessage = httpError?.error?.message;
    if (Array.isArray(serverMessage)) return serverMessage.join(', ');
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    if (typeof httpError?.message === 'string' && httpError.message.trim()) return httpError.message;
    return fallback;
  }
}