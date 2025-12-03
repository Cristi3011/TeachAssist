import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('TeachAssist');
  // currentUser stored as a signal (null or object)
  currentUser = signal<any | null>(null);

  constructor(private router: Router) {
    // initialize from localStorage
    try {
      const raw = localStorage.getItem('teachassist_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log('[App] initializing currentUser from localStorage:', { username: parsed?.username, role: parsed?.role });
        this.currentUser.set(parsed);
      } else {
        console.log('[App] no user in localStorage');
      }
    } catch {}

    // listen for login events from other components
    window.addEventListener('auth:login', (e: any) => {
      console.log('[App] auth:login event', { username: e?.detail?.username, role: e?.detail?.role });
      if (e?.detail) this.currentUser.set(e.detail);
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
}
