import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CancellationaddeditComponent } from './cancellationaddedit/cancellationaddedit.component';
import { CancellationlistComponent } from './cancellationlist/cancellationlist.component';
import { CancellationreasonComponent } from './cancellationreason.component';
import { CancellationviewComponent } from './cancellationview/cancellationview.component';

const routes: Routes = [{
  path: '',
  component: CancellationreasonComponent,
  children: [
    {
      path: 'cancellationlist',
      component: CancellationlistComponent,
      data: {
        title: 'cancellation list'
      }
    },
    {
      path: 'cancellationadd',
      component: CancellationaddeditComponent,
      data: {
        title: 'cancellation add'
      }
    },
    {
      path: 'cancellationedit/:id',
      component: CancellationaddeditComponent,
      data: {
        title: 'cancellation edit'
      }
    },
    {
      path: 'cancellationview/:id',
      component: CancellationviewComponent,
      data: {
        title: 'cancellation view'
      }
    },{
      path: '',
      redirectTo: 'cancellationlist',
      pathMatch: 'full'
    }
  ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CancellationreasonRoutingModule { }
