import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages-routing.module';
import { PagesComponent } from './pages.component';
import { PageslistComponent } from './pageslist/pageslist.component';
import { PagesaddeditComponent } from './pagesaddedit/pagesaddedit.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { EditorModule } from '@tinymce/tinymce-angular';
import { DriverlandingpageComponent } from './driverlandingpage/driverlandingpage.component';
import { ImageCropperModule } from 'ngx-image-cropper';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { NgSelectModule } from '@ng-select/ng-select';
@NgModule({
  declarations: [
    PagesComponent,
    PageslistComponent,
    PagesaddeditComponent,
    DriverlandingpageComponent
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
    EditorModule,
    ImageCropperModule,
    AngularEditorModule,
    TabsModule.forRoot(),
    NgSelectModule
  ]
})
export class PagesModule { }
