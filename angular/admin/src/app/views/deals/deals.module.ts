import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DealsRoutingModule } from './deals-routing.module';
import { DealAddEditComponent } from './deal-add-edit/deal-add-edit.component';
import { DealListComponent } from './deal-list/deal-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ImageCropperModule } from 'ngx-image-cropper';


@NgModule({
  declarations: [
    DealAddEditComponent,
    DealListComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    CommonTableModule,
    ModalModule.forRoot(),
    ImageCropperModule,
    DealsRoutingModule
  ]
})
export class DealsModule { }
