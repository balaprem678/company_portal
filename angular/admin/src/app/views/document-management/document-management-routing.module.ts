import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditDocumentComponent } from './add-edit-document/add-edit-document.component';
import { DocumentListComponent } from './document-list/document-list.component';
import { DocumentManagementComponent } from './document-management.component';

const routes: Routes = [
  {
    path: '',
    component: DocumentManagementComponent,
    children: [
      {
        path: 'list',
        component: DocumentListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddEditDocumentComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddEditDocumentComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: AddEditDocumentComponent,
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
export class DocumentManagementRoutingModule { }
