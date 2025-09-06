import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TransactionRoutingModule } from './transaction-routing.module';
import { TransactionComponent } from './transaction.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ImageCropperModule } from 'ngx-image-cropper';
import { NgxIntlTelInputModule } from '@khazii/ngx-intl-tel-input';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { SharedModule } from 'src/app/shared/shared.module';


@NgModule({
  declarations: [
    TransactionComponent
  ],
  imports: [
    CommonModule,
    TransactionRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule,
    NgxIntlTelInputModule,
    ImageCropperModule,
    NgSelectModule,
    CommonTableModule,
  ]
})
export class TransactionModule { }
