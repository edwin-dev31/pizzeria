import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { BranchService } from '../../core/services/branch.service';
import { ColorPickerComponent } from '../../shared/components/color-picker/color-picker.component';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULTS = {
  background: '#181412',
  primary: '#ae4313',
  secondary: '#e99e21',
  textLight: '#d6d1c5',
  darkSupport: '#502212',
} as const;

@Component({
  selector: 'app-theme-editor',
  standalone: true,
  imports: [ColorPickerComponent],
  templateUrl: './theme-editor.component.html',
  styleUrl: './theme-editor.component.scss',
})
export class ThemeEditorComponent implements OnInit {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly branchService = inject(BranchService);

  readonly background = signal<string>(DEFAULTS.background);
  readonly primary = signal<string>(DEFAULTS.primary);
  readonly secondary = signal<string>(DEFAULTS.secondary);
  readonly textLight = signal<string>(DEFAULTS.textLight);
  readonly darkSupport = signal<string>(DEFAULTS.darkSupport);

  readonly validationErrors = signal<Record<string, string>>({});
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly hasErrors = computed(() => Object.keys(this.validationErrors()).length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadTheme();
  }

  async loadTheme(): Promise<void> {
    const branch = this.branchService.activeBranch();
    if (!branch) return;

    const { data, error } = await this.supabase
      .from('theme_configs')
      .select('*')
      .eq('branch_id', branch.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load theme:', error.message);
      return;
    }

    if (data) {
      this.background.set(data.color_background ?? DEFAULTS.background);
      this.primary.set(data.color_primary ?? DEFAULTS.primary);
      this.secondary.set(data.color_secondary ?? DEFAULTS.secondary);
      this.textLight.set(data.color_text_light ?? DEFAULTS.textLight);
      this.darkSupport.set(data.color_dark_support ?? DEFAULTS.darkSupport);
      this.applyPreview();
    }
  }

  onBackgroundChange(value: string): void {
    this.background.set(value);
    this.clearError('background');
    this.applyPreview();
  }

  onPrimaryChange(value: string): void {
    this.primary.set(value);
    this.clearError('primary');
    this.applyPreview();
  }

  onSecondaryChange(value: string): void {
    this.secondary.set(value);
    this.clearError('secondary');
    this.applyPreview();
  }

  onTextLightChange(value: string): void {
    this.textLight.set(value);
    this.clearError('textLight');
    this.applyPreview();
  }

  onDarkSupportChange(value: string): void {
    this.darkSupport.set(value);
    this.clearError('darkSupport');
    this.applyPreview();
  }

  onValidationError(field: string, message: string): void {
    this.validationErrors.update((errs) => ({ ...errs, [field]: message }));
  }

  private clearError(field: string): void {
    this.validationErrors.update((errs) => {
      const copy = { ...errs };
      delete copy[field];
      return copy;
    });
  }

  private applyPreview(): void {
    const root = document.documentElement.style;
    root.setProperty('--color-bg', this.background());
    root.setProperty('--color-primary', this.primary());
    root.setProperty('--color-secondary', this.secondary());
    root.setProperty('--color-text-light', this.textLight());
    root.setProperty('--color-dark-support', this.darkSupport());
  }

  private validateAll(): boolean {
    const fields: Array<{ key: string; value: string; label: string }> = [
      { key: 'background', value: this.background(), label: 'Background' },
      { key: 'primary', value: this.primary(), label: 'Primary' },
      { key: 'secondary', value: this.secondary(), label: 'Secondary' },
      { key: 'textLight', value: this.textLight(), label: 'Light Text' },
      { key: 'darkSupport', value: this.darkSupport(), label: 'Dark Support' },
    ];

    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (!HEX_REGEX.test(field.value)) {
        errors[field.key] = `${field.label}: "${field.value}" is not a valid hex color. Use format #RRGGBB.`;
      }
    }

    this.validationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  async save(): Promise<void> {
    this.saveError.set(null);
    this.saveSuccess.set(false);

    if (!this.validateAll()) return;

    const branch = this.branchService.activeBranch();
    if (!branch) {
      this.saveError.set('No active branch selected.');
      return;
    }

    this.isSaving.set(true);

    const { error } = await this.supabase.from('theme_configs').upsert(
      {
        branch_id: branch.id,
        color_background: this.background(),
        color_primary: this.primary(),
        color_secondary: this.secondary(),
        color_text_light: this.textLight(),
        color_dark_support: this.darkSupport(),
      },
      { onConflict: 'branch_id' }
    );

    this.isSaving.set(false);

    if (error) {
      this.saveError.set('Failed to save theme: ' + error.message);
      return;
    }

    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  reset(): void {
    this.background.set(DEFAULTS.background);
    this.primary.set(DEFAULTS.primary);
    this.secondary.set(DEFAULTS.secondary);
    this.textLight.set(DEFAULTS.textLight);
    this.darkSupport.set(DEFAULTS.darkSupport);
    this.validationErrors.set({});
    this.saveError.set(null);
    this.applyPreview();
  }
}
