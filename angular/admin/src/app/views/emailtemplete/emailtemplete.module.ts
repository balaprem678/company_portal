import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmailtempleteRoutingModule } from './emailtemplete-routing.module';
import { EmailtempleteComponent } from './emailtemplete.component';
import { EmailtempletelistComponent } from './emailtempletelist/emailtempletelist.component';
import { EmailtempleteaddeditComponent } from './emailtempleteaddedit/emailtempleteaddedit.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { EditorModule } from '@tinymce/tinymce-angular';
import { AngularEditorModule } from '@kolkov/angular-editor';
@NgModule({
  declarations: [
    EmailtempleteComponent,
    EmailtempletelistComponent,
    EmailtempleteaddeditComponent
  ],
  imports: [
    CommonModule,
    EmailtempleteRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
    EditorModule,
    AngularEditorModule,
  ]
})
export class EmailtempleteModule { }
