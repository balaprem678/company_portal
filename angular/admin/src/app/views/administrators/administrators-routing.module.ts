import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAddeditComponent } from './admin-addedit/admin-addedit.component';
import { AdminListComponent } from './admin-list/admin-list.component';
import { AdministratorsComponent } from './administrators.component';
import { SubAdminAddeditComponent } from './sub-admin-addedit/sub-admin-addedit.component';
import { SubAdminListComponent } from './sub-admin-list/sub-admin-list.component';

const routes: Routes = [
  {
    path: '',
    component: AdministratorsComponent,
    children: [
      {
        path: 'list',
        component: AdminListComponent,
        data: {
          title: 'Admin'
        }
      },
      {
        path: 'admin-add',
        component: AdminAddeditComponent,
        data: {
          title: 'Admin Add'
        }
      },
      {
        path: 'admin-edit/:id',
        component: AdminAddeditComponent,
        data: {
          title: 'Admin Edit'
        }
      },
      {
        path: 'sub-admin-list',
        component: SubAdminListComponent,
        data: {
          title: 'Sub Admin'
        }
      },
      {
        path: 'sub-admin-add',
        component: SubAdminAddeditComponent,
        data: {
          title: 'Sub Admin Add'
        }
      },
      {
        path: 'sub-admin-edit/:id',
        component: SubAdminAddeditComponent,
        data: {
          title: 'Sub Admin Edit'
        }
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdministratorsRoutingModule { }
