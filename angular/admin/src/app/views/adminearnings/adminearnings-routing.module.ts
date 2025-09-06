import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminearningsComponent } from './adminearnings.component';
import { AdminearningslistComponent } from './adminearningslist/adminearningslist.component';

const routes: Routes = [{
  path: '',
  component: AdminearningsComponent,
  children: [{
    path: 'adminearningslist',
    component: AdminearningslistComponent,
    data: {
      title: 'Admin Earnings'
    }
  },{
    path: '',
    redirectTo: 'adminearningslist',
    pathMatch: 'full'
  }]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminearningsRoutingModule { }
