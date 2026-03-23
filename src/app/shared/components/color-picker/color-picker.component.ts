import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
})
export class ColorPickerComponent {
  value = input<string>('#000000');
  label = input<string>('Color');

  valueChange = output<string>();
  validationError = output<string>();

  hexInput = signal<string>('#000000');
  isInvalid = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.hexInput.set(this.value());
      this.isInvalid.set(false);
    }, { allowSignalWrites: true });
  }

  onColorPickerChange(event: Event): void {
    const newValue = (event.target as HTMLInputElement).value;
    this.hexInput.set(newValue);
    this.isInvalid.set(false);
    this.valueChange.emit(newValue);
  }

  onTextInputChange(event: Event): void {
    const newValue = (event.target as HTMLInputElement).value;
    this.hexInput.set(newValue);

    if (HEX_REGEX.test(newValue)) {
      this.isInvalid.set(false);
      this.valueChange.emit(newValue);
    } else {
      this.isInvalid.set(true);
      this.validationError.emit(`"${newValue}" is not a valid hex color. Use format #RRGGBB.`);
    }
  }
}
