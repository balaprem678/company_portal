import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InterestComponent } from './interest.component';
import { InterestaddEditComponent } from './interestadd-edit/interestadd-edit.component';
import { InterestlistComponent } from './interestlist/interestlist.component';

const routes: Routes = [
  {
    path: '',
    component: InterestComponent,
    children: [
      {
        path: 'list',
        component: InterestlistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: InterestaddEditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: InterestaddEditComponent,
        data: {
          title: 'Edit'
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
export class InterestRoutingModule { }
