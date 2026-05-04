import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home {
  logged = false;
  isStudent = false;
  isTeacher = false;

  constructor() {
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.logged = true;
        const role = (parsed?.role || 'student').toString().toLowerCase();
        this.isTeacher = role === 'professor';
        this.isStudent = role !== 'professor';
      } else {
        this.logged = false;
        this.isTeacher = false;
        this.isStudent = false;
      }
    } catch {
      this.logged = false;
      this.isTeacher = false;
      this.isStudent = false;
    }

    // update on auth events (login includes detail with safe user)
    window.addEventListener('auth:login', (e: any) => {
      this.logged = true;
      const role = (e?.detail?.role || 'student').toString().toLowerCase();
      this.isTeacher = role === 'professor';
      this.isStudent = role !== 'professor';
    });
    window.addEventListener('auth:logout', () => {
      this.logged = false;
      this.isTeacher = false;
      this.isStudent = false;
    });
  }
}
