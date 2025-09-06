import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CityManagementRoutingModule } from './city-management-routing.module';
import { CityFareComponent } from './city-fare/city-fare.component';
import { CityWarehouseComponent } from './city-warehouse/city-warehouse.component';
import { CityAddAreaComponent } from './city-add-area/city-add-area.component';
import { CityDashboardComponent } from './city-dashboard/city-dashboard.component';
import { CityListComponent } from './city-list/city-list.component';
import { AddCityComponent } from './add-city/add-city.component';
import { NgChartsModule } from 'ng2-charts';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { environment } from 'src/environments/environment';
import { CityarealistComponent } from './cityarealist/cityarealist.component';


@NgModule({
  declarations: [
    CityFareComponent,
    CityWarehouseComponent,
    CityAddAreaComponent,
    CityDashboardComponent,
    CityListComponent,
    AddCityComponent,
    CityarealistComponent,
     
  ],
  imports: [
    CommonModule,
    CityManagementRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgChartsModule,
    CommonTableModule,
    // AgmCoreModule.forRoot({
    //   apiKey: environment.mapKey,
    //   libraries: ["places"]
    // }),
  ]
})
export class CityManagementModule { }
