import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FuelRecordsComponent } from './fuel-records.component';
import { FuelRecordsListComponent } from './fuel-records-list/fuel-records-list.component';

const routes: Routes = [
  {
    path: '',
    component: FuelRecordsComponent,
    children: [
      {
        path: 'fuel-records-list',
        component: FuelRecordsListComponent,
        data: {
          title: 'List'
        }
      },

    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FuelRecordsRoutingModule { }
