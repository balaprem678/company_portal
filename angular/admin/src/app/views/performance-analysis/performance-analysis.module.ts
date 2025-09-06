import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PerformanceAnalysisRoutingModule } from './performance-analysis-routing.module';
import { PerformanceAnalysisComponent } from './performance-analysis.component';
import { PerformanceAnalysisListComponent } from './performance-analysis-list/performance-analysis-list.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [
    PerformanceAnalysisComponent,
    PerformanceAnalysisListComponent
  ],
  imports: [
    CommonModule,
    PerformanceAnalysisRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class PerformanceAnalysisModule { }
