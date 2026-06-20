import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'StreamVid',
    loadComponent: () => import('./layouts/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        title: 'Home',
        loadComponent: () => import('./features/public/home/home.component')
          .then(m => m.HomeComponent),
      },
      {
        path: 'explore',
        loadComponent: () => import('./features/public/explore/explore.component')
          .then(m => m.ExploreComponent),
      },
      {
        path: 'trending',
        loadComponent: () => import('./features/public/trending/trending.component')
          .then(m => m.TrendingComponent),
      },
      {
        path: 'video/:slug',
        title: 'Video',
        loadComponent: () => import('./features/public/video-detail/video-detail.component')
          .then(m => m.VideoDetailComponent),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/public/profile/profile.component')
          .then(m => m.ProfileComponent),
      },
      {
        path: 'library',
        canActivate: [authGuard],
        loadComponent: () => import('./features/public/library/library.component')
          .then(m => m.LibraryComponent),
      },
    ],
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./features/auth/login.component')
      .then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    title: 'Admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Dashboard Admin',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component')
          .then(m => m.DashboardComponent),
      },
      {
        path: 'videos',
        title: 'Manajemen Video',
        loadComponent: () => import('./features/admin/video-manager/video-manager.component')
          .then(m => m.VideoManagerComponent),
      },
      {
        path: 'categories',
        title: 'Manajemen Kategori',
        loadComponent: () => import('./features/admin/category-manager/category-manager.component')
          .then(m => m.CategoryManagerComponent),
      },
      {
        path: 'profile',
        title: 'Profile Admin',
        loadComponent: () => import('./features/admin/profile/profile.component')
          .then(m => m.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
