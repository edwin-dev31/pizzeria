import { Component, computed, input, signal } from '@angular/core';
import { ProductImage } from '../../../core/models/product-image.model';

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  imports: [],
  templateUrl: './image-carousel.component.html',
  styleUrl: './image-carousel.component.scss',
})
export class ImageCarouselComponent {
  images = input<ProductImage[]>([]);

  currentIndex = signal(0);

  currentImage = computed(() => {
    const imgs = this.images();
    return imgs.length > 0 ? imgs[this.currentIndex()] : null;
  });

  hasMultiple = computed(() => this.images().length > 1);

  counter = computed(() => `${this.currentIndex() + 1} / ${this.images().length}`);

  next(): void {
    const len = this.images().length;
    if (len === 0) return;
    this.currentIndex.update(i => (i + 1) % len);
  }

  prev(): void {
    const len = this.images().length;
    if (len === 0) return;
    this.currentIndex.update(i => (i - 1 + len) % len);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder.png';
  }
}
