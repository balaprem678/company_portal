import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddCityComponent } from './add-city/add-city.component';
import { CityAddAreaComponent } from './city-add-area/city-add-area.component';
import { CityDashboardComponent } from './city-dashboard/city-dashboard.component';
import { CityFareComponent } from './city-fare/city-fare.component';
import { CityListComponent } from './city-list/city-list.component';
import { CityManagementComponent } from './city-management.component';
import { CityWarehouseComponent } from './city-warehouse/city-warehouse.component';
import { CityarealistComponent } from './cityarealist/cityarealist.component';

const routes: Routes = [
  {
    path : '',
    component : CityManagementComponent,
    children : [
      {
        path: 'city_dashboard',
        component: CityDashboardComponent,
        data: {
          title: 'City Dashboard'
        }
      },
      {
        path: 'list',
        component: CityListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddCityComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddCityComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'city_fare/:id',
        component: CityFareComponent,
        data: {
          title: 'City Fare'
        }
      },
      {
        path: 'city_warehouse/:id',
        component: CityWarehouseComponent,
        data: {
          title: 'City Warehouse'
        }
      },
      {
        path: 'city_area/:id',
        component: CityAddAreaComponent,
        data: {
          title: 'Add City Area'
        }
      },
      {
        path: 'editCity_area/:id',
        component: CityAddAreaComponent,
        data: {
          title: 'Edit City Area'
        }
      },
      {
        path: 'city_area_list/:id',
        component: CityarealistComponent,
        data: {
          title: 'City Area List'
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
export class CityManagementRoutingModule { }
