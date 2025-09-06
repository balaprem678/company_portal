import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddeditComponent } from './addedit/addedit.component';
import { DriverdashboardComponent } from './driverdashboard/driverdashboard.component';
import { DriverorderlistComponent } from './driverorderlist/driverorderlist.component';
import { DriversComponent } from './drivers.component';
import { DriverslistComponent } from './driverslist/driverslist.component';
import { DriversviewComponent } from './driversview/driversview.component';
import { UnapproveddriverlistComponent } from './unapproveddriverlist/unapproveddriverlist.component';

const routes: Routes = [{
  path: '',
  component: DriversComponent,
  children: [{
    path: 'driverslist',
    component: DriverslistComponent,
    data: {
      title: 'driverslist'
    } 
  },
  {
    path: 'driversview/:id',
    component: DriversviewComponent,
    data: {
      title: 'driversview'
    }
  },
  {
    path: 'adddriver',
    component: AddeditComponent,
    data: {
      title: 'add driver'
    }
  },
  {
    path: 'editdriver/:id',
    component: AddeditComponent,
    data: {
      title: 'edit driver'
    }
  },
  {
    path: 'unapprovedriverlist',
    component: UnapproveddriverlistComponent,
    data: {
      title: 'UnApprove Driver'
    }
  },
  {
    path: 'driverdashboard',
    component: DriverdashboardComponent,
    data: {
      title: 'driver dashboard'
    }
  },
  {
    path: 'driverorder/:id',
    component: DriverorderlistComponent,
    data: {
      title: 'Order List'
    }
  },{
    path: '',
    redirectTo: 'driverslist',
    pathMatch: 'full'
  }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DriversRoutingModule { }
