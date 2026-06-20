import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  LucideAlertCircle,
  LucideCheck,
  LucideLock,
  LucideUser,
} from '@lucide/angular';
import { finalize, take } from 'rxjs/operators';
import { updateAuthUser } from '../../../core/auth/auth.actions';
import { selectUser } from '../../../core/auth/auth.selectors';
import { ProfileService } from './profile.service';

type ProfileForm = FormGroup<{
  username: FormControl<string>;
}>;

type PasswordForm = FormGroup<{
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword) {
    return null;
  }

  return newPassword === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAlertCircle,
    LucideCheck,
    LucideLock,
    LucideUser,
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly store = inject(Store);
  private readonly profileService = inject(ProfileService);

  protected readonly user = this.store.selectSignal(selectUser);
  protected readonly isLoadingProfile = signal(false);
  protected readonly isLoadingPassword = signal(false);
  protected readonly profileSuccess = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordSuccess = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly profileForm: ProfileForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
  });

  protected readonly passwordForm: PasswordForm = new FormGroup(
    {
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    {
      validators: [passwordMatchValidator],
    }
  );

  protected readonly email = computed(() => this.user()?.email ?? '-');
  protected readonly role = computed(() => this.user()?.role ?? 'ADMIN');

  protected readonly usernameError = computed(() => {
    const control = this.profileForm.controls.username;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Username wajib diisi.';
    }

    if (control.hasError('minlength')) {
      return 'Username minimal 3 karakter.';
    }

    return '';
  });

  protected readonly newPasswordError = computed(() => {
    const control = this.passwordForm.controls.newPassword;

    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Password baru wajib diisi.';
    }

    if (control.hasError('minlength')) {
      return 'Password baru minimal 8 karakter.';
    }

    return '';
  });

  protected readonly confirmPasswordError = computed(() => {
    const control = this.passwordForm.controls.confirmPassword;

    if ((!control.touched && !control.dirty) && !this.passwordForm.hasError('passwordMismatch')) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Konfirmasi password baru wajib diisi.';
    }

    if (this.passwordForm.hasError('passwordMismatch')) {
      return 'Konfirmasi password baru harus sama.';
    }

    return '';
  });

  constructor() {
    effect(() => {
      const username = this.user()?.username ?? '';

      if (username !== this.profileForm.controls.username.getRawValue()) {
        this.profileForm.controls.username.setValue(username, { emitEvent: false });
      }
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.isLoadingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const user = this.user();
    if (!user) {
      this.profileError.set('Data akun admin tidak tersedia.');
      this.profileSuccess.set(null);
      return;
    }

    this.isLoadingProfile.set(true);
    this.profileSuccess.set(null);
    this.profileError.set(null);

    this.profileService
      .updateProfile(this.profileForm.controls.username.getRawValue().trim())
      .pipe(
        take(1),
        finalize(() => this.isLoadingProfile.set(false))
      )
      .subscribe({
        next: (updatedUser) => {
          this.store.dispatch(updateAuthUser({ user: updatedUser }));
          this.profileSuccess.set('Profile berhasil diperbarui.');
          this.profileError.set(null);
          this.profileForm.markAsPristine();
        },
        error: (error: HttpErrorResponse) => {
          this.profileSuccess.set(null);
          this.profileError.set(this.resolveProfileError(error));
        },
      });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid || this.isLoadingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoadingPassword.set(true);
    this.passwordSuccess.set(null);
    this.passwordError.set(null);

    const { newPassword } = this.passwordForm.getRawValue();

    this.profileService
      .updatePassword(newPassword)
      .pipe(
        take(1),
        finalize(() => this.isLoadingPassword.set(false))
      )
      .subscribe({
        next: () => {
          this.passwordSuccess.set('Password berhasil diperbarui.');
          this.passwordError.set(null);
          this.passwordForm.reset({
            newPassword: '',
            confirmPassword: '',
          });
        },
        error: (error: HttpErrorResponse) => {
          this.passwordSuccess.set(null);
          this.passwordError.set(this.resolvePasswordError(error));
        },
      });
  }

  private resolveProfileError(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'Username sudah dipakai. Gunakan username lain.';
    }

    return 'Gagal memperbarui profile. Silakan coba lagi.';
  }

  private resolvePasswordError(error: HttpErrorResponse): string {
    if (error.status === 400) {
      return 'Data password tidak valid. Periksa kembali input Anda.';
    }

    return 'Gagal mengganti password. Silakan coba lagi.';
  }
}
