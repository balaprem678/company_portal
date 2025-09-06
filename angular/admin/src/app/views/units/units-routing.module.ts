import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditUnitsComponent } from './add-edit-units/add-edit-units.component';
import { UnitlistComponent } from './unitlist/unitlist.component';
import { UnitsComponent } from './units.component';

const routes: Routes = [{
  path: '',
  component: UnitsComponent,
  children: [{
    path: 'units-add',
    component: AddEditUnitsComponent,
    data: {
      title: 'Add'
    }
  },
  {
    path: 'units-list',
    component: UnitlistComponent,
    data: {
      title: 'List'
    }
  },
  {
    path: 'units-add/:id',
    component: AddEditUnitsComponent,
    data: {
      title: 'Edit'
    }
  },{
    path: '',
    redirectTo: 'units-list',
    pathMatch: 'full'
  }

  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UnitsRoutingModule { }
