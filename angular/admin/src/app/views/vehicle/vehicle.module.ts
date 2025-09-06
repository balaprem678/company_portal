import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VehicleRoutingModule } from './vehicle-routing.module';
import { VehicleComponent } from './vehicle.component';
import { VehicleListComponent } from './vehicle-list/vehicle-list.component';
import { AddeditVehicleComponent } from './addedit-vehicle/addedit-vehicle.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    VehicleComponent,
    VehicleListComponent,
    AddeditVehicleComponent
  ],
  imports: [
    CommonModule,
    VehicleRoutingModule,
    CommonTableModule,
    TabsModule.forRoot(),
    FormsModule,
  ]
})
export class VehicleModule { }
