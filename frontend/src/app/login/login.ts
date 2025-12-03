import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  model = { email: '', password: '' };

  constructor(private router: Router) {
    // if already logged in (localStorage), redirect to role page
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
    this.submit();
  }

  async submit() {
    try {
      const res = await fetch('http://localhost:3000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.model),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Login failed');
        console.error('Login error', data);
        return;
      }
      if (data.message && data.message.toLowerCase().includes('invalid')) {
        alert('Invalid credentials');
        return;
      }
      console.log('Login success', { username: data.user?.username, role: data.user?.role });
      // persist user locally and notify app
      try {
        // persist only the safe user fields
        const safe = { username: data.user?.username, email: data.user?.email, role: data.user?.role };
        localStorage.setItem('teachassist_user', JSON.stringify(safe));
        window.dispatchEvent(new CustomEvent('auth:login', { detail: safe }));
      } catch {}

      const role = data?.user?.role || 'student';
      if (role.toLowerCase() === 'professor') {
        this.router.navigate(['/professor']);
      } else {
        this.router.navigate(['/student']);
      }
      
    } catch (err) {
      console.error(err);
      alert('Network error during login');
    }
  }
}
