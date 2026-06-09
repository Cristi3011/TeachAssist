import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../shared/alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  model = { email: '', password: '' };
  private returnUrl: string | null = null;

  private defaultRouteForRole(role?: string): string {
    return (role || '').toLowerCase() === 'admin' ? '/admin' : '/dashboard';
  }

  constructor(private router: Router, private route: ActivatedRoute, private alerts: AlertService) {
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (raw) {
        const user = JSON.parse(raw);
        this.router.navigate([this.defaultRouteForRole(user?.role)]);
        return;
      }
    } catch {}
    try {
      const raw = this.route.snapshot.queryParamMap.get('returnUrl');
      this.returnUrl = raw ? decodeURIComponent(raw) : null;
    } catch {}
  }

  onSubmit(e: Event) {
    e?.preventDefault();
    this.submit();
  }

  async submit() {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.model),
      });
      const data = await res.json();
      if (!res.ok) {
        this.alerts.error(data.message || 'Login failed');
        console.error('Login error', data);
        return;
      }
      if (data.message && data.message.toLowerCase().includes('invalid')) {
        this.alerts.warning('Invalid credentials');
        return;
      }
      console.log('Login success', { username: data.user?.username, role: data.user?.role });
      try {
        const safe = { username: data.user?.username, email: data.user?.email, role: data.user?.role };
        localStorage.setItem('teachassist_user', JSON.stringify(safe));
        if (data.token && data.token.accessToken) {
          localStorage.setItem('teachassist_token', data.token.accessToken);
        }
        window.dispatchEvent(new CustomEvent('auth:login', { detail: safe }));
      } catch {}

      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.router.navigate([this.defaultRouteForRole(data.user?.role)]);
      }
      
    } catch (err) {
      console.error(err);
      this.alerts.error('Network error during login');
    }
  }
}
