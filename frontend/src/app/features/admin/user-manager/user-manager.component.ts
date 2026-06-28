import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideLoaderCircle,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize, take } from 'rxjs/operators';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ManagedUser, SaveUserPayload, UserRole, UserService } from './user.service';

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type UserForm = FormGroup<{
  email: FormControl<string>;
  username: FormControl<string>;
  role: FormControl<UserRole>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-user-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    LucideLoaderCircle,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideTrash,
    LucideUsers,
    LucideX,
    PaginationComponent,
  ],
  templateUrl: './user-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagerComponent {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly listError = signal('');
  protected readonly actionError = signal('');
  protected readonly successMessage = signal('');
  protected readonly userToDelete = signal<ManagedUser | null>(null);
  protected readonly editingUser = signal<ManagedUser | null>(null);
  protected readonly showUserModal = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly roleFilter = signal<UserRole | ''>('');
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly roleControl = new FormControl<UserRole | ''>('', { nonNullable: true });
  protected readonly pagination = signal<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  protected readonly form: UserForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    role: new FormControl<UserRole>('USER', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.minLength(8)],
    }),
  });

  protected readonly hasUsers = computed(() => this.users().length > 0);
  protected readonly isEditing = computed(() => this.editingUser() !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditing() ? 'Edit data user' : 'Tambah user baru'
  );
  protected readonly modalEyebrow = computed(() =>
    this.isEditing() ? 'Edit User' : 'Tambah User'
  );
  protected readonly submitLabel = computed(() =>
    this.isEditing() ? 'Simpan Perubahan' : 'Tambah User'
  );

  constructor() {
    this.bindSearch();
    this.bindRoleFilter();
    this.loadUsers();
  }

  protected loadUsers(page = this.pagination().page): void {
    this.isLoading.set(true);
    this.listError.set('');

    this.userService
      .getUsers(page, this.pagination().limit, {
        search: this.searchQuery(),
        role: this.roleFilter(),
      })
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.users.set(response.users);
          this.pagination.set({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: Math.max(response.totalPages, 1),
          });
        },
        error: () => this.listError.set('Gagal memuat daftar user. Silakan coba lagi.'),
      });
  }

  protected openCreateModal(): void {
    this.editingUser.set(null);
    this.actionError.set('');
    this.form.reset({
      email: '',
      username: '',
      role: 'USER',
      password: '',
    });
    this.setPasswordRequired(true);
    this.showUserModal.set(true);
  }

  protected openEditModal(user: ManagedUser): void {
    this.editingUser.set(user);
    this.actionError.set('');
    this.form.reset({
      email: user.email,
      username: user.username,
      role: user.role,
      password: '',
    });
    this.setPasswordRequired(false);
    this.showUserModal.set(true);
  }

  protected closeUserModal(): void {
    this.showUserModal.set(false);
    this.editingUser.set(null);
    this.actionError.set('');
    this.form.reset({
      email: '',
      username: '',
      role: 'USER',
      password: '',
    });
    this.setPasswordRequired(false);
  }

  protected saveUser(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.actionError.set('');
    this.successMessage.set('');

    const payload = this.buildPayload();
    const editingUser = this.editingUser();
    const request$ = editingUser
      ? this.userService.updateUser(editingUser.id, payload)
      : this.userService.createUser(payload);

    request$
      .pipe(
        take(1),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (savedUser) => {
          this.closeUserModal();
          this.successMessage.set(
            editingUser
              ? `Data ${savedUser.username} berhasil diperbarui.`
              : `User ${savedUser.username} berhasil ditambahkan.`
          );
          this.loadUsers(editingUser ? this.pagination().page : 1);
        },
        error: (error: HttpErrorResponse) => {
          this.actionError.set(this.resolveSaveError(error));
        },
      });
  }

  protected askDelete(user: ManagedUser): void {
    this.userToDelete.set(user);
  }

  protected cancelDelete(): void {
    this.userToDelete.set(null);
  }

  protected confirmDelete(): void {
    const user = this.userToDelete();
    if (!user || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.actionError.set('');
    this.successMessage.set('');

    this.userService
      .deleteUser(user.id)
      .pipe(
        take(1),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.userToDelete.set(null);
          this.successMessage.set(`Akun ${user.username} berhasil dihapus.`);
          this.loadUsers(this.pagination().page);
        },
        error: (error: HttpErrorResponse) => {
          this.actionError.set(this.resolveActionError(error, 'menghapus user'));
        },
      });
  }

  protected goToPage(page: number): void {
    if (page === this.pagination().page || page < 1 || page > this.pagination().totalPages) {
      return;
    }

    this.loadUsers(page);
  }

  protected clearSearch(): void {
    if (!this.searchQuery()) {
      return;
    }

    this.searchControl.setValue('');
  }

  protected clearFilters(): void {
    this.searchControl.setValue('');
    this.roleControl.setValue('');
  }

  protected getRoleBadgeClasses(role: UserRole): string {
    return role === 'ADMIN'
      ? 'border-violet-400/20 bg-violet-500/10 text-violet-200'
      : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200';
  }

  protected getRoleLabel(role: UserRole): string {
    return role === 'ADMIN' ? 'Administrator' : 'User';
  }

  protected get emailError(): string {
    const control = this.form.controls.email;
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Email wajib diisi.';
    }

    if (control.hasError('email')) {
      return 'Format email tidak valid.';
    }

    return '';
  }

  protected get usernameError(): string {
    const control = this.form.controls.username;
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
  }

  protected get passwordError(): string {
    const control = this.form.controls.password;
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Password wajib diisi.';
    }

    if (control.hasError('minlength')) {
      return 'Password minimal 8 karakter.';
    }

    return '';
  }

  private bindSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {
        const nextSearch = value.trim();

        if (nextSearch === this.searchQuery()) {
          return;
        }

        this.searchQuery.set(nextSearch);
        this.loadUsers(1);
      });
  }

  private bindRoleFilter(): void {
    this.roleControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        if (role === this.roleFilter()) {
          return;
        }

        this.roleFilter.set(role);
        this.loadUsers(1);
      });
  }

  private buildPayload(): SaveUserPayload {
    const raw = this.form.getRawValue();
    const payload: SaveUserPayload = {
      email: raw.email.trim(),
      username: raw.username.trim(),
      role: raw.role,
    };

    if (raw.password.trim()) {
      payload.password = raw.password.trim();
    }

    return payload;
  }

  private setPasswordRequired(required: boolean): void {
    const validators = required
      ? [Validators.required, Validators.minLength(8)]
      : [Validators.minLength(8)];

    this.form.controls.password.setValidators(validators);
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
  }

  private resolveSaveError(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'Email atau username sudah dipakai. Gunakan data lain.';
    }

    if (error.status === 400) {
      return 'Data user tidak valid. Periksa kembali input Anda.';
    }

    return 'Gagal menyimpan data user. Silakan coba lagi.';
  }

  private resolveActionError(error: HttpErrorResponse, action: string): string {
    if (error.status === 400) {
      return `Permintaan untuk ${action} ditolak. Periksa data lalu coba lagi.`;
    }

    if (error.status === 404) {
      return 'User tidak ditemukan. Muat ulang daftar untuk sinkronisasi data.';
    }

    return `Gagal ${action}. Silakan coba lagi.`;
  }
}
