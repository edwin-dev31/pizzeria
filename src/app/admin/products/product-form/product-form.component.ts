import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../app.config';
import { NotificationService } from '../../../core/services/notification.service';
import { BranchService } from '../../../core/services/branch.service';
import { Product } from '../../../core/models/product.model';
import { ProductImage } from '../../../core/models/product-image.model';
import { MenuSection } from '../../../core/models/menu-section.model';
import { environment } from '../../../../environments/environment';

interface UploadTask {
  file: File;
  progress: number;
  done: boolean;
  error: boolean;
  url: string | null;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgOptimizedImage],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly branchService = inject(BranchService);

  // Inputs / Outputs
  readonly product = input<Product | null>(null);
  readonly sections = input<MenuSection[]>([]);
  readonly saved = output<Product>();
  readonly cancelled = output<void>();

  // Form
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    section_id: ['', Validators.required],
  });

  // State signals
  readonly isSaving = signal(false);
  readonly existingImages = signal<ProductImage[]>([]);
  readonly uploadTasks = signal<UploadTask[]>([]);

  readonly isEditMode = computed(() => !!this.product()?.id);

  readonly pendingUploads = computed(() =>
    this.uploadTasks().filter((t) => !t.done && !t.error)
  );

  ngOnInit(): void {
    const p = this.product();
    if (p) {
      this.form.patchValue({
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        section_id: p.section_id,
      });
      this.existingImages.set(p.images ?? []);
    } else {
      // Pre-select first section if available
      const secs = this.sections();
      if (secs.length > 0) {
        this.form.patchValue({ section_id: secs[0].id });
      }
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newTasks: UploadTask[] = Array.from(input.files).map((file) => ({
      file,
      progress: 0,
      done: false,
      error: false,
      url: null,
    }));

    this.uploadTasks.update((tasks) => [...tasks, ...newTasks]);
    // Reset input so same file can be re-selected
    input.value = '';
  }

  removeUploadTask(index: number): void {
    this.uploadTasks.update((tasks) => tasks.filter((_, i) => i !== index));
  }

  async deleteExistingImage(image: ProductImage): Promise<void> {
    const { error } = await this.supabase
      .from('product_images')
      .delete()
      .eq('id', image.id);

    if (error) {
      this.notificationService.show('Failed to delete image', 'error');
      return;
    }

    this.existingImages.update((imgs) => imgs.filter((img) => img.id !== image.id));
    this.notificationService.show('Image deleted', 'success');
  }

  private uploadToCloudinary(task: UploadTask, productId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', task.file);
      formData.append('upload_preset', environment.cloudinary.uploadPreset);
      formData.append('folder', `products/${productId}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          this.uploadTasks.update((tasks) =>
            tasks.map((t) => (t === task ? { ...t, progress: pct } : t))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          this.uploadTasks.update((tasks) =>
            tasks.map((t) =>
              t === task ? { ...t, progress: 100, done: true, url: res.secure_url } : t
            )
          );
          resolve(res.secure_url);
        } else {
          this.uploadTasks.update((tasks) =>
            tasks.map((t) => (t === task ? { ...t, error: true } : t))
          );
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        this.uploadTasks.update((tasks) =>
          tasks.map((t) => (t === task ? { ...t, error: true } : t))
        );
        reject(new Error('Network error during upload'));
      };

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`
      );
      xhr.send(formData);
    });
  }

  private async uploadPendingImages(productId: string): Promise<void> {
    const tasks = this.uploadTasks().filter((t) => !t.done && !t.error);
    if (tasks.length === 0) return;

    const existingCount = this.existingImages().length;

    const uploads = tasks.map((task, i) =>
      this.uploadToCloudinary(task, productId).then(async (url) => {
        const displayOrder = existingCount + i;
        await this.supabase.from('product_images').insert({
          product_id: productId,
          url,
          display_order: displayOrder,
        });
      })
    );

    await Promise.allSettled(uploads);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);

    const branch = this.branchService.activeBranch();
    const { name, description, price, section_id } = this.form.getRawValue();

    try {
      let savedProduct: Product;

      if (this.isEditMode()) {
        const productId = this.product()!.id;
        const { data, error } = await this.supabase
          .from('products')
          .update({ name, description: description || null, price, section_id })
          .eq('id', productId)
          .select()
          .single();

        if (error) throw error;
        savedProduct = data as Product;
      } else {
        const { data, error } = await this.supabase
          .from('products')
          .insert({
            name,
            description: description || null,
            price,
            section_id,
            branch_id: branch?.id,
            is_available: true,
            display_order: 0,
          })
          .select()
          .single();

        if (error) throw error;
        savedProduct = data as Product;
      }

      await this.uploadPendingImages(savedProduct.id);

      // Fetch final product with images
      const { data: finalData } = await this.supabase
        .from('products')
        .select('*, images:product_images(*)')
        .eq('id', savedProduct.id)
        .single();

      this.notificationService.show(
        this.isEditMode() ? 'Product updated' : 'Product created',
        'success'
      );
      this.saved.emit((finalData ?? savedProduct) as Product);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      this.notificationService.show(msg, 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  trackBySection(_: number, section: MenuSection): string {
    return section.id;
  }

  trackByImage(_: number, image: ProductImage): string {
    return image.id;
  }

  trackByTask(index: number, _: UploadTask): number {
    return index;
  }
}
