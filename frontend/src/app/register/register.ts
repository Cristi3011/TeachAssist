import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  model = { username: '', email: '', password: '', role: 'student' };

  constructor(private router: Router) {
    // redirect away from register when already logged in
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (raw) {
        const user = JSON.parse(raw);
        const role = (user?.role || 'student').toString().toLowerCase();
        if (role === 'professor') this.router.navigate(['/professor']);
        else this.router.navigate(['/student']);
      }
    } catch {}
  }

  onSubmit(e: Event) {
    e?.preventDefault();
    if (!this.isFormValid()) {
      alert('Please complete all required fields with valid values.');
      return;
    }
    this.submit();
  }

  isFormValid() {
    const u = (this.model.username || '').toString().trim();
    const e = (this.model.email || '').toString().trim();
    const p = (this.model.password || '').toString();
    if (!u || !e || !p) return false;
    // basic email check
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!emailOk) return false;
    // password minimum length
    if (p.length < 6) return false;
    return true;
  }

  async submit() {
    try {
      const res = await fetch('http://localhost:3000/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.model),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Register failed');
        console.error('Register error', data);
        return;
      }
      alert('Registered successfully');
      console.log('Registered', data);
    } catch (err) {
      console.error(err);
      alert('Network error during register');
    }
  }
}
