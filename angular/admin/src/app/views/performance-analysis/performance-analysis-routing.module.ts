import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PerformanceAnalysisComponent } from './performance-analysis.component';
import { PerformanceAnalysisListComponent } from './performance-analysis-list/performance-analysis-list.component';

const routes: Routes = [
  {
    path: '',
    component: PerformanceAnalysisComponent,
    children: [
      {
        path: 'peroformance-analysis-list',
        component: PerformanceAnalysisListComponent,
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
export class PerformanceAnalysisRoutingModule { }
