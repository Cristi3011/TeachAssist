import { Injectable, signal } from '@angular/core';

export type AppAlertType = 'success' | 'error' | 'warning' | 'info';

export type AppAlert = {
  id: number;
  type: AppAlertType;
  message: string;
};

@Injectable({ providedIn: 'root' })
export class AlertService {
  private idCounter = 0;
  private readonly _alerts = signal<AppAlert[]>([]);

  readonly alerts = this._alerts.asReadonly();

  show(message: string, type: AppAlertType = 'info', durationMs = 4200) {
    const text = (message || '').toString().trim();
    if (!text) return;

    const id = ++this.idCounter;
    const alert: AppAlert = { id, type, message: text };
    this._alerts.update((list) => [alert, ...list].slice(0, 5));

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(message: string, durationMs?: number) {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs?: number) {
    this.show(message, 'error', durationMs);
  }

  warning(message: string, durationMs?: number) {
    this.show(message, 'warning', durationMs);
  }

  info(message: string, durationMs?: number) {
    this.show(message, 'info', durationMs);
  }

  dismiss(id: number) {
    this._alerts.update((list) => list.filter((item) => item.id !== id));
  }
}
