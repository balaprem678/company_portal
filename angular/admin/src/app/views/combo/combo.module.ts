import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComboRoutingModule } from './combo-routing.module';
import { ComboAddEditComponent } from './combo-add-edit/combo-add-edit.component';
import { ComboListComponent } from './combo-list/combo-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ImageCropperModule } from 'ngx-image-cropper';


@NgModule({
  declarations: [
    ComboAddEditComponent,
    ComboListComponent
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    CommonTableModule,
    ModalModule.forRoot(),
    ImageCropperModule,
    CommonModule,
    ComboRoutingModule
  ]
})
export class ComboModule { }
