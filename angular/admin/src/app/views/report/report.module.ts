import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportRoutingModule } from './report-routing.module';
import { ReportComponent } from './report.component';
import { ReportedListComponent } from './reported-list/reported-list.component';
import { ReportlistComponent } from './reportlist/reportlist.component';
import { ReportaddeditComponent } from './reportaddedit/reportaddedit.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FinanceReportComponent } from './finance-report/finance-report.component';
import { NgApexchartsModule } from "ng-apexcharts";


@NgModule({
  declarations: [
    ReportComponent,
    ReportedListComponent,
    ReportlistComponent,
    ReportaddeditComponent,
    FinanceReportComponent
  ],
  imports: [
    CommonModule,
    ReportRoutingModule,
    NgApexchartsModule,
    EditorModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class ReportModule { }
