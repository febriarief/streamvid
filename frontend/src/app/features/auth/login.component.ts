import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  LucideEye,
  LucideEyeOff,
  LucideLoaderCircle,
  LucideLogIn,
  LucideLockKeyhole,
  LucideMail,
} from '@lucide/angular';
import { login } from '../../core/auth/auth.actions';
import {
  selectAuthError,
  selectAuthLoading,
} from '../../core/auth/auth.selectors';

type LoginForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideEye,
    LucideEyeOff,
    LucideLoaderCircle,
    LucideLogIn,
    LucideLockKeyhole,
    LucideMail,
  ],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly store = inject(Store);

  protected readonly hidePassword = signal(true);
  protected readonly isLoading = this.store.selectSignal(selectAuthLoading);
  protected readonly authError = this.store.selectSignal(selectAuthError);

  protected readonly form: LoginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  protected readonly emailError = computed(() => {
    const control = this.form.controls.email;

    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Email wajib diisi.';
    }

    if (control.hasError('email')) {
      return 'Format email tidak valid.';
    }

    return '';
  });

  protected readonly passwordError = computed(() => {
    const control = this.form.controls.password;

    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Password wajib diisi.';
    }

    if (control.hasError('minlength')) {
      return 'Password minimal 8 karakter.';
    }

    return '';
  });

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  protected submit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.store.dispatch(login({ email, password }));
  }
}
