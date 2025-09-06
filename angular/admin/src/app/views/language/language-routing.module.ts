import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LanguageComponent } from './language.component';
import { LanguageaddEditComponent } from './languageadd-edit/languageadd-edit.component';
import { LanguagelistComponent } from './languagelist/languagelist.component';
import { LanguagemanageComponent } from './languagemanage/languagemanage.component';

const routes: Routes = [
  {
    path: '',
    component: LanguageComponent,
    children: [
      {
        path: 'list',
        component: LanguagelistComponent,
        data: {
          title: 'list'
        }
      },
      {
        path: 'add',
        component: LanguageaddEditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: LanguageaddEditComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'manage/:id',
        component: LanguagemanageComponent,
        data: {
          title: 'Manage'
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
export class LanguageRoutingModule { }
