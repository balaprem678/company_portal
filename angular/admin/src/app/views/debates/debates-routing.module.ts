import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DebatelistComponent } from './debatelist/debatelist.component';
import { DebatesComponent } from './debates.component';
import { DebateviewComponent } from './debateview/debateview.component';

const routes: Routes = [
  {
    path: '',
    component: DebatesComponent,
    children: [
      {
        path: 'list',
        component: DebatelistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'list/:user_id',
        component: DebatelistComponent,
        data: {
          title: 'Debate List'
        }
      },
      {
        path: 'view/:id',
        component: DebateviewComponent,
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
export class DebatesRoutingModule { }
