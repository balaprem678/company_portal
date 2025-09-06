import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentManagementRoutingModule } from './document-management-routing.module';
import { DocumentListComponent } from './document-list/document-list.component';
import { AddEditDocumentComponent } from './add-edit-document/add-edit-document.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    DocumentListComponent,
    AddEditDocumentComponent
  ],
  imports: [
    CommonModule,
    DocumentManagementRoutingModule,
    CommonTableModule,
    FormsModule,
  ]
})
export class DocumentManagementModule { }
