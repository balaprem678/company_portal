import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmailtempleteComponent } from './emailtemplete.component';
import { EmailtempleteaddeditComponent } from './emailtempleteaddedit/emailtempleteaddedit.component';
import { EmailtempletelistComponent } from './emailtempletelist/emailtempletelist.component';

const routes: Routes = [
  {
    path: '',
    component: EmailtempleteComponent,
    children: [
      {
        path: 'list',
        component: EmailtempletelistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: EmailtempleteaddeditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: EmailtempleteaddeditComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: EmailtempleteaddeditComponent,
        data: {
          title: 'View'
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
export class EmailtempleteRoutingModule { }
