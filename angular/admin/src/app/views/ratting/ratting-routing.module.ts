import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RattingQuesAddeditComponent } from './ratting-ques-addedit/ratting-ques-addedit.component';
import { RattingQuesComponent } from './ratting-ques/ratting-ques.component';
import { RattingComponent } from './ratting.component';

const routes: Routes = [
  {
    path: '',
    component: RattingComponent,
    children: [
      {
        path: 'list',
        component: RattingQuesComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: RattingQuesAddeditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: RattingQuesAddeditComponent,
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
export class RattingRoutingModule { }
