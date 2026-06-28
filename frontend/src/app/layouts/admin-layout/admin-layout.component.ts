import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideArrowLeft,
  LucideFolderTree,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMenu,
  LucideUser,
  LucideUsers,
  LucideVideo,
} from '@lucide/angular';
import { logout } from '../../core/auth/auth.actions';
import { selectUser } from '../../core/auth/auth.selectors';

type AdminNavItem = {
  label: string;
  path: string;
  exact?: boolean;
  icon: 'dashboard' | 'video' | 'category' | 'users' | 'profile';
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideArrowLeft,
    LucideFolderTree,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMenu,
    LucideUser,
    LucideUsers,
    LucideVideo,
  ],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly store = inject(Store);

  protected readonly isSidebarCollapsed = signal(false);
  protected readonly user = this.store.selectSignal(selectUser);
  protected readonly userDisplayName = computed(
    () => this.user()?.username || this.user()?.email || 'Admin'
  );
  protected readonly navigationItems: AdminNavItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', exact: true, icon: 'dashboard' },
    { label: 'Categories', path: '/admin/categories', icon: 'category' },
    { label: 'Videos', path: '/admin/videos', icon: 'video' },
    { label: 'Profile', path: '/admin/profile', icon: 'profile' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
  ];

  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update((value) => !value);
  }

  protected logout(): void {
    this.store.dispatch(logout());
  }
}
