import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdministratorsRoutingModule } from './administrators-routing.module';
import { AdministratorsComponent } from '../administrators/administrators.component';
import { AdminListComponent } from './admin-list/admin-list.component';
import { AdminAddeditComponent } from './admin-addedit/admin-addedit.component';
import { SubAdminAddeditComponent } from './sub-admin-addedit/sub-admin-addedit.component';
import { SubAdminListComponent } from './sub-admin-list/sub-admin-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EditorModule } from '@tinymce/tinymce-angular';
import { CommonTableModule } from 'src/app/common-table/common-table.module';


@NgModule({
  declarations: [
    AdministratorsComponent,
    AdminListComponent,
    AdminAddeditComponent,
    SubAdminAddeditComponent,
    SubAdminListComponent
  ],
  imports: [
    CommonModule,
    AdministratorsRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
    EditorModule
  ]
})
export class AdministratorsModule { }
