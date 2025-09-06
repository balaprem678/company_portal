import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NotificationRoutingModule } from './notification-routing.module';
import { NotificationComponent } from './notification.component';
import { ListComponent } from './list/list.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { TempleteComponent } from './templete/templete.component';
import { TempleteAddeditComponent } from './templete-addedit/templete-addedit.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { ModalModule } from 'ngx-bootstrap/modal';
import { NgSelectModule } from '@ng-select/ng-select';
import { DriverlistComponent } from './driverlist/driverlist.component';
@NgModule({
  declarations: [
    NotificationComponent,
    ListComponent,
    TempleteComponent,
    TempleteAddeditComponent,
    DriverlistComponent
  ],
  imports: [
    CommonModule,
    NotificationRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    EditorModule,
    NgSelectModule,
    ModalModule.forRoot()
  ]
})
export class NotificationModule { }
