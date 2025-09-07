import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportComponent } from './report.component';
import { ReportaddeditComponent } from './reportaddedit/reportaddedit.component';
import { ReportedListComponent } from './reported-list/reported-list.component';
import { ReportlistComponent } from './reportlist/reportlist.component';
import { FinanceReportComponent } from './finance-report/finance-report.component';

const routes: Routes = [
  {
    path: '',
    component: ReportComponent,
    children: [
      {
        path: 'reported-list',
        component: ReportlistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'finance-report',
        component: FinanceReportComponent,
        data: {
          title: 'Finance Report'
        }
      },
      {
        path: 'report-list',
        component: ReportlistComponent,
        data: {
          title: 'Templete List'
        }
      },
      {
        path: 'report-add',
        component: ReportaddeditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'report-edit/:id',
        component: ReportaddeditComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: '',
        redirectTo: 'reported-list',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportRoutingModule { }
