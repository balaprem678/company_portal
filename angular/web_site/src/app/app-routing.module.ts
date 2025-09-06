import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { PaymentFailureComponent } from './payment-failure/payment-failure.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';
import { SitePageComponent } from './site-page/site-page.component';
import { PaymentstatusComponent } from './paymentstatus/paymentstatus.component';
import { CodOrderStatusComponent } from './cod-order-status/cod-order-status.component';
import { NotFoundComponent } from './not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./views/views.module').then(m => m.ViewsModule),
    data: {
      title: 'Home'
    }
  },
  {
    path: 'page/:slug',
    component: SitePageComponent
  },
  {
    path: 'page/:slug/:id',
    component: SitePageComponent
  },
  // {
  //   path: 'page/:slug/Homemade',
  //   component: SitePageComponent
  // },
  // {
  //   path: 'page/:slug/Traditional',
  //   component: SitePageComponent
  // },
  {
    path: 'payment-success',
    component: PaymentSuccessComponent
  },
  {
    path: 'cod-success',
    component: CodOrderStatusComponent
  },
  {
    path: 'payment/order/:order_id',
    component: PaymentstatusComponent
  },
  {
    path: 'payment-failure',
    component: PaymentFailureComponent
  },
   {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes,{ scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
