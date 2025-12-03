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

  constructor() {
    try {
      this.logged = !!localStorage.getItem('teachassist_user');
    } catch {
      this.logged = false;
    }
    // update on auth events
    window.addEventListener('auth:login', () => (this.logged = true));
    window.addEventListener('auth:logout', () => (this.logged = false));
  }
}
