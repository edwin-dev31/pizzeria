import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const id = Date.now().toString();
    this._toasts.update(queue => [...queue, { id, message, type }]);
    setTimeout(() => this.remove(id), 3000);
  }

  remove(id: string): void {
    this._toasts.update(queue => queue.filter(t => t.id !== id));
  }
}
