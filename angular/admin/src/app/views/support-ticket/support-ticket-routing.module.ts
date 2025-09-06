import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListComponent } from './list/list.component';
import { SupportTicketComponent } from './support-ticket.component';
import { ViewComponent } from './view/view.component';

const routes: Routes = [
  {
    path: '',
    component: SupportTicketComponent,
    children: [
      {
        path: 'list',
        component: ListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'view/:id',
        component: ViewComponent,
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
export class SupportTicketRoutingModule { }
