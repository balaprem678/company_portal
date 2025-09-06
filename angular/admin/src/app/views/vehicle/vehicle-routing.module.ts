import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddeditVehicleComponent } from './addedit-vehicle/addedit-vehicle.component';
import { VehicleListComponent } from './vehicle-list/vehicle-list.component';
import { VehicleComponent } from './vehicle.component';

const routes: Routes = [
  {
    path: '',
    component: VehicleComponent,
    children: [
      {
        path: 'list',
        component: VehicleListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddeditVehicleComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddeditVehicleComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: AddeditVehicleComponent,
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
export class VehicleRoutingModule { }
