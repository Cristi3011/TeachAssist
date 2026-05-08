import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../shared/alert.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  model = { username: '', email: '', password: '', role: 'student' };

  constructor(private router: Router, private alerts: AlertService) {
    // redirect away from register when already logged in
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (raw) {
        const user = JSON.parse(raw);
        const role = (user?.role || 'student').toString().toLowerCase();
        if (role === 'admin') this.router.navigate(['/admin']);
        else this.router.navigate(['/dashboard']);
      }
    } catch {}
  }

  onSubmit(e: Event) {
    e?.preventDefault();
    if (!this.isFormValid()) {
      this.alerts.warning('Please complete all required fields with valid values.');
      return;
    }
    this.submit();
  }

  isFormValid() {
    const u = (this.model.username || '').toString().trim();
    const e = (this.model.email || '').toString().trim();
    const p = (this.model.password || '').toString();
    if (!u || !e || !p) return false;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!emailOk) return false;
    if (p.length < 6) return false;
    return true;
  }

  async submit() {
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.model),
      });
      const data = await res.json();
      if (!res.ok) {
        this.alerts.error(data.message || 'Register failed');
        console.error('Register error', data);
        return;
      }

      const user = {
        username: data?.user?.username || this.model.username,
        email: data?.user?.email || this.model.email,
        role: (data?.user?.role || 'student').toString().toLowerCase(),
      };

      localStorage.setItem('teachassist_user', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('auth:login', { detail: user }));

      if (user.role === 'admin') await this.router.navigate(['/admin']);
      else await this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error(err);
      this.alerts.error('Network error during register');
    }
  }
}
