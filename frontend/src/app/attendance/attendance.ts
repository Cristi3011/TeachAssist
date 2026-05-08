import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../shared/alert.service';

@Component({
  selector: 'app-attendance-mark',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
  styleUrls: ['./attendance.scss'],
})
export class AttendanceMark {
  token = '';
  email = '';
  loading = false;
  loggedIn = false;

  constructor(private route: ActivatedRoute, private router: Router, private alerts: AlertService) {
    this.route.queryParamMap.subscribe((params) => {
      this.token = (params.get('token') || '').toString();
      try {
        const raw = localStorage.getItem('teachassist_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.email = parsed?.email || '';
          this.loggedIn = !!this.email;
        }
      } catch {}
    });
  }

  async submit() {
    if (!this.token) return this.alerts.error('Token invalid');
    const studentEmail = (this.email || '').trim();
    if (!studentEmail) return this.alerts.warning('Introduceți email-ul');
    this.loading = true;
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token, studentEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Eroare la marcarea prezenței');
      this.alerts.success('Prezența a fost înregistrată');
      // optionally navigate back to dashboard
      setTimeout(() => this.router.navigate(['/dashboard']), 1200);
    } catch (err: any) {
      this.alerts.error(err?.message || 'Network error');
    } finally {
      this.loading = false;
    }
  }

  goToLogin() {
    const returnUrl = window.location.pathname + window.location.search;
    this.router.navigate(['/login'], { queryParams: { returnUrl: encodeURIComponent(returnUrl) } });
  }
}
