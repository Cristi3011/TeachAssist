import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AlertService, AppAlertType } from './shared/alert.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('TeachAssist');
  private readonly alertService = inject(AlertService);
  currentUser = signal<any | null>(null);
  alerts = this.alertService.alerts;

  isAdmin(): boolean {
    return (this.currentUser()?.role || '').toString().toLowerCase() === 'admin';
  }

  constructor(private router: Router) {
    this.installCustomAlerts();

    try {
      const raw = localStorage.getItem('teachassist_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log('[App] initializing currentUser from localStorage:', { username: parsed?.username, role: parsed?.role });
        this.currentUser.set(parsed);
        this.syncUserRoleFromServer(parsed);
      } else {
        console.log('[App] no user in localStorage');
      }
    } catch {}

    window.addEventListener('auth:login', (e: any) => {
      console.log('[App] auth:login event', { username: e?.detail?.username, role: e?.detail?.role });
      if (e?.detail) {
        this.currentUser.set(e.detail);
        if (!e.detail.__serverSynced) this.syncUserRoleFromServer(e.detail);
      }
    });

    window.addEventListener('auth:logout', () => {
      console.log('[App] auth:logout event');
      this.currentUser.set(null);
    });
  }

  logout() {
    localStorage.removeItem('teachassist_user');
    window.dispatchEvent(new Event('auth:logout'));
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  dismissAlert(id: number) {
    this.alertService.dismiss(id);
  }

  trackAlert(_: number, item: { id: number }) {
    return item.id;
  }

  private installCustomAlerts() {
    const marker = '__teachassist_custom_alert_patched__';
    const win = window as any;
    if (win[marker]) return;
    win[marker] = true;

    window.alert = (message?: unknown) => {
      const text = (message ?? '').toString().trim();
      if (!text) return;
      this.alertService.show(text, this.inferAlertType(text));
    };
  }

  private inferAlertType(message: string): AppAlertType {
    const text = (message || '').toLowerCase();
    if (text.includes('success') || text.includes('trimis') || text.includes('actualizat') || text.includes('reu')) return 'success';
    if (text.includes('invalid') || text.includes('complet') || text.includes('introdu')) return 'warning';
    if (text.includes('error') || text.includes('failed') || text.includes('nu am putut') || text.includes('eroare')) return 'error';
    return 'info';
  }

  private async syncUserRoleFromServer(user: any) {
    const email = (user?.email || '').toString().trim().toLowerCase();
    if (!email) return;

    try {
      const res = await fetch('http://localhost:3000/users');
      if (!res.ok) return;
      const users = await res.json();
      const found = (users || []).find((u: any) => (u?.email || '').toString().trim().toLowerCase() === email);
      if (!found) return;

      const merged = {
        username: found?.username || user?.username || '',
        email,
        role: (found?.role || user?.role || '').toString().toLowerCase(),
      };

      localStorage.setItem('teachassist_user', JSON.stringify(merged));
      this.currentUser.set(merged);
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { ...merged, __serverSynced: true } }));
    } catch {
      // keep local user when network is unavailable
    }
  }
}
