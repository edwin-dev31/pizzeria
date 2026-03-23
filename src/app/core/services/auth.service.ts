import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, Session } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly router = inject(Router);

  readonly session = signal<Session | null>(null);

  constructor() {
    // Populate signal with the current session on init
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });

    // Keep signal in sync and handle session expiry
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.session.set(session);

      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        this.router.navigate(['/admin/login']);
      }

      // Redirect to login when session expires
      if (event === 'USER_UPDATED' && !session) {
        this.router.navigate(['/admin/login']);
      }
    });
  }

  login(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/admin/login']);
  }
}
