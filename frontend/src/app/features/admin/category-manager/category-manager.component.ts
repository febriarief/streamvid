import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideLoaderCircle,
  LucidePlus,
  LucideTrash,
  LucideX,
} from '@lucide/angular';
import { finalize, take } from 'rxjs/operators';
import { AdminPaginationComponent } from '../../../shared/components/admin-pagination/admin-pagination.component';
import { Category, CategoryService } from './category.service';

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type CategoryForm = FormGroup<{
  name: FormControl<string>;
}>;

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    LucideLoaderCircle,
    LucidePlus,
    LucideTrash,
    LucideX,
    AdminPaginationComponent,
  ],
  templateUrl: './category-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagerComponent {
  private readonly categoryService = inject(CategoryService);

  protected readonly categories = signal<Category[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly listError = signal('');
  protected readonly submitError = signal('');
  protected readonly categoryToDelete = signal<Category | null>(null);
  protected readonly showCreateModal = signal(false);
  protected readonly pagination = signal<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  protected readonly form: CategoryForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  protected readonly nameControl = this.form.controls.name;

  protected readonly hasCategories = computed(() => this.categories().length > 0);

  constructor() {
    this.loadCategories();
  }

  protected openCreateModal(): void {
    this.submitError.set('');
    this.form.reset({ name: '' });
    this.showCreateModal.set(true);
  }

  protected closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.submitError.set('');
    this.form.reset({ name: '' });
  }

  protected loadCategories(page = this.pagination().page): void {
    this.isLoading.set(true);
    this.listError.set('');

    this.categoryService
      .getCategories(page, this.pagination().limit)
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.categories.set(response.categories);
          this.pagination.set({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: Math.max(response.totalPages, 1),
          });
        },
        error: () => this.listError.set('Gagal memuat kategori. Silakan coba lagi.'),
      });
  }

  protected createCategory(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.submitError.set('');

    this.categoryService
      .createCategory(this.nameControl.getRawValue().trim())
      .pipe(
        take(1),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.closeCreateModal();
          this.loadCategories(this.pagination().page);
        },
        error: () => this.submitError.set('Gagal menambahkan kategori. Nama mungkin sudah dipakai.'),
      });
  }

  protected askDelete(category: Category): void {
    this.categoryToDelete.set(category);
  }

  protected cancelDelete(): void {
    this.categoryToDelete.set(null);
  }

  protected confirmDelete(): void {
    const category = this.categoryToDelete();
    if (!category) {
      return;
    }

    this.isSaving.set(true);
    this.listError.set('');

    this.categoryService
      .deleteCategory(category.id)
      .pipe(
        take(1),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.categoryToDelete.set(null);
          this.loadCategories(this.pagination().page);
        },
        error: () => this.listError.set('Gagal menghapus kategori. Pastikan kategori tidak sedang dipakai.'),
      });
  }

  protected goToPage(page: number): void {
    if (page === this.pagination().page || page < 1 || page > this.pagination().totalPages) {
      return;
    }

    this.loadCategories(page);
  }

  protected get nameError(): string {
    if (!this.nameControl.invalid || (!this.nameControl.touched && !this.nameControl.dirty)) {
      return '';
    }

    return 'Nama kategori wajib diisi.';
  }
}
