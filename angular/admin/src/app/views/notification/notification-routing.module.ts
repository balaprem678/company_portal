import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DriverlistComponent } from './driverlist/driverlist.component';
import { AddeditComponent } from '../drivers/addedit/addedit.component';
import { ListComponent } from './list/list.component';
import { NotificationComponent } from './notification.component';
import { TempleteAddeditComponent } from './templete-addedit/templete-addedit.component';
import { TempleteComponent } from './templete/templete.component';

const routes: Routes = [
  {
    path: '',
    component: NotificationComponent,
    children: [
      {
        path: 'list',
        component: ListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'driverlist',
        component: DriverlistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'templete',
        component: TempleteComponent,
        data: {
          title: 'Templete'
        }
      },
      {
        path: 'templete-add',
        component: TempleteAddeditComponent,
        data: {
          title: 'Templete Add'
        }
      },
      {
        path: 'templete-edit/:id',
        component: TempleteAddeditComponent,
        data: {
          title: 'Templete Edit'
        }
      },
      {
        path: '',
        redirectTo: 'templete',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NotificationRoutingModule { }
