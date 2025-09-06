import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LanguageRoutingModule } from './language-routing.module';
import { LanguageComponent } from './language.component';
import { LanguagelistComponent } from './languagelist/languagelist.component';
import { LanguageaddEditComponent } from './languageadd-edit/languageadd-edit.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImageCropperModule } from 'ngx-image-cropper';
import { LanguagemanageComponent } from './languagemanage/languagemanage.component';

@NgModule({
  declarations: [
    LanguageComponent,
    LanguagelistComponent,
    LanguageaddEditComponent,
    LanguagemanageComponent
  ],
  imports: [
    CommonModule,
    LanguageRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    ImageCropperModule
  ]
})
export class LanguageModule { }
