import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TagsRoutingModule } from './tags-routing.module';
import { TaglistComponent } from './taglist/taglist.component';
import { AddEditTagComponent } from './add-edit-tag/add-edit-tag.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ImageCropperModule } from 'ngx-image-cropper';


@NgModule({
  declarations: [
    TaglistComponent,
    AddEditTagComponent
  ],
  imports: [
    CommonModule,
    TagsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    CommonTableModule,
    ModalModule.forRoot(),
    ImageCropperModule

  ]
})
export class TagsModule { }
