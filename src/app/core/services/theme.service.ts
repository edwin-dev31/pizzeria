import { effect, inject, Injectable, signal, Signal } from '@angular/core';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { ThemeConfig } from '../models/theme-config.model';
import { BranchService } from './branch.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly branchService: BranchService = inject(BranchService);

  private readonly _theme = signal<ThemeConfig | null>(null);
  private _channel: RealtimeChannel | null = null;

  readonly theme: Signal<ThemeConfig | null> = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const branch = this.branchService.activeBranch();
      if (branch) {
        this.loadTheme(branch.id);
        this.subscribeToRealtime(branch.id);
      }
    }, { allowSignalWrites: true });
  }

  async loadTheme(branchId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('theme_configs')
      .select('*')
      .eq('branch_id', branchId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load theme:', error.message);
      return;
    }

    if (data) {
      this._theme.set(data);
      this.applyTheme(data);
    }
  }

  applyTheme(theme: ThemeConfig): void {
    const root = document.documentElement.style;
    root.setProperty('--color-bg', theme.color_background);
    root.setProperty('--color-primary', theme.color_primary);
    root.setProperty('--color-secondary', theme.color_secondary);
    root.setProperty('--color-text-light', theme.color_text_light);
    root.setProperty('--color-dark-support', theme.color_dark_support);
  }

  subscribeToRealtime(branchId: string): void {
    this.unsubscribe();

    this._channel = this.supabase
      .channel(`theme:${branchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'theme_configs', filter: `branch_id=eq.${branchId}` },
        () => {
          this.loadTheme(branchId);
        }
      )
      .subscribe();
  }

  private unsubscribe(): void {
    if (this._channel) {
      this.supabase.removeChannel(this._channel);
      this._channel = null;
    }
  }
}
