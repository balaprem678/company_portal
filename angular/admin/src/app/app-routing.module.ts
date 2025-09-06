import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { DebatedetailsComponent } from './debatedetails/debatedetails.component';
import { ErrorComponent } from './error/error.component';
import { Page404Component } from './page404/page404.component';
import { SitePageComponent } from './site-page/site-page.component';
import { SuccessComponent } from './success/success.component';
import { AuthGuard } from './_helpers/auth.guard';

const routes: Routes = [
  {
    path: 'app',
    loadChildren: () => import('./views/views.module').then(m => m.ViewsModule),
    data: {
      title: 'Home'
    },
    canActivate: [AuthGuard]
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '404',
    component: Page404Component
  },
  {
    path: 'error/:id', // id ==> 1= user email verify error, 2=
    component: ErrorComponent
  },
  {
    path: 'success/:id', // id ==> 1= user email verify success, 2=
    component: SuccessComponent
  },
  {
    path: 'site-page/:slug',
    component: SitePageComponent
  },
  {
    path: 'debate-details/:id',
    component: DebatedetailsComponent
  },
  {
    path: '',
    redirectTo: 'app',
    pathMatch: 'full'
  },
 
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
    preloadingStrategy: PreloadAllModules
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
