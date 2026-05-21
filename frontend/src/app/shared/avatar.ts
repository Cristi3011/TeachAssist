import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.html',
  styleUrls: ['./avatar.scss']
})
export class Avatar {
  @Output() clicked = new EventEmitter<void>();
  @Input() name: string | null = null;
  @Input() src: string | null = null;
  @Input() color: string | null = null;
  @Input() size: number = 40;

  onImgError() {
    this.src = null;
  }

  get initial(): string {
    const n = (this.name || '').toString().trim();
    return n ? n.charAt(0).toUpperCase() : '';
  }

  get bgColor(): string {
    if (this.color) return this.color;
    const colors = ['#6c5ce7', '#00b894', '#00a8ff', '#fdcb6e', '#e17055', '#0984e3', '#d63031', '#fd79a8'];
    const n = (this.name || '').toString().trim().toLowerCase();
    if (!n) return '#b2bec3';
    let hash = 0;
    for (let i = 0; i < n.length; i++) hash = (hash << 5) - hash + n.charCodeAt(i);
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }
}
