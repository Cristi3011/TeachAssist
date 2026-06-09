import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AlertService, AppAlertType } from './shared/alert.service';
import { Avatar } from './shared/avatar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule, Avatar],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('TeachAssist');
  private readonly alertService = inject(AlertService);
  currentUser = signal<any | null>(null);
  showUserMenu = signal(false);
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

    // close user menu when clicking outside
    window.addEventListener('click', () => this.showUserMenu.set(false));
  }

  logout() {
    localStorage.removeItem('teachassist_user');
    window.dispatchEvent(new Event('auth:logout'));
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  toggleUserMenu() {
    this.showUserMenu.set(!this.showUserMenu());
  }

  dismissAlert(id: number) {
    this.alertService.dismiss(id);
  }

  trackAlert(_: number, item: { id: number }) {
    return item.id;
  }

  async onAvatarSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input || !input.files || !input.files.length) return;
    const file = input.files[0];
    // basic validation: accept images only, max 2MB
    if (!file.type.startsWith('image/')) {
      this.alertService.show('Fișier invalid: alege o imagine', 'warning');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.alertService.show('Fișier prea mare: max 2MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as string;
      try {
        const token = localStorage.getItem('teachassist_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/users/avatar', {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: this.currentUser()?.email, avatar: data }),
        });
        const json = await res.json();
        if (json?.ok && json?.user) {
          const user = json.user;
          // update local UI state; persist only core fields (no avatar) in localStorage
          const core = { username: user.username, email: user.email, role: user.role };
          try { localStorage.setItem('teachassist_user', JSON.stringify(core)); } catch {}
          this.currentUser.set({ ...core, avatarUrl: user.avatarUrl, avatarColor: user.avatarColor || null });
          this.alertService.show('Imagine de profil actualizată', 'success');
        } else {
          this.alertService.show(json?.message || 'Eroare la încărcare', 'error');
        }
      } catch (err) {
        this.alertService.show('Eroare la încărcare', 'error');
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
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
      const token = localStorage.getItem('teachassist_token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/users', { headers });
      if (!res.ok) return;
      const users = await res.json();
      const found = (users || []).find((u: any) => (u?.email || '').toString().trim().toLowerCase() === email);
      if (!found) return;

      const merged = {
        username: found?.username || user?.username || '',
        email,
        role: (found?.role || user?.role || '').toString().toLowerCase(),
        avatarUrl: found?.avatarUrl || user?.avatarUrl || null,
        avatarColor: found?.avatarColor || user?.avatarColor || null,
      };

      localStorage.setItem('teachassist_user', JSON.stringify(merged));
      this.currentUser.set(merged);
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { ...merged, __serverSynced: true } }));
    } catch {
      // keep local user when network is unavailable
    }
  }
}
