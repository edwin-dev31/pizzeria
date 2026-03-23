import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';

function whatsappValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  if (!value) return null;
  const valid = /^\d{7,15}$/.test(value);
  return valid ? null : { whatsappFormat: true };
}

@Component({
  selector: 'app-branch-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './branch-settings.component.html',
  styleUrl: './branch-settings.component.scss',
})
export class BranchSettingsComponent implements OnInit {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly branchService = inject(BranchService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly isSaving = signal(false);

  readonly form: FormGroup = this.fb.group({
    display_name: ['', Validators.required],
    whatsapp_number: ['', [Validators.required, whatsappValidator]],
    currency_symbol: ['', Validators.required],
  });

  readonly isFormInvalid = computed(() => {
    // Trigger re-evaluation when saving state changes (keeps computed reactive)
    this.isSaving();
    return this.form.invalid;
  });

  ngOnInit(): void {
    const branch = this.branchService.activeBranch();
    if (branch) {
      this.form.patchValue({
        display_name: branch.display_name,
        whatsapp_number: branch.whatsapp_number,
        currency_symbol: branch.currency_symbol,
      });
    }
  }

  get displayNameControl() { return this.form.get('display_name')!; }
  get whatsappControl() { return this.form.get('whatsapp_number')!; }
  get currencyControl() { return this.form.get('currency_symbol')!; }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const branch = this.branchService.activeBranch();
    if (!branch) {
      this.notifications.show('No active branch selected.', 'error');
      return;
    }

    this.isSaving.set(true);

    const { display_name, whatsapp_number, currency_symbol } = this.form.getRawValue();

    const { error } = await this.supabase
      .from('branches')
      .upsert(
        { id: branch.id, tenant_id: branch.tenant_id, slug: branch.slug, display_name, whatsapp_number, currency_symbol },
        { onConflict: 'id' }
      );

    this.isSaving.set(false);

    if (error) {
      this.notifications.show('Failed to save settings: ' + error.message, 'error');
      return;
    }

    await this.branchService.loadBranches();
    this.notifications.show('Branch settings saved.', 'success');
  }
}
