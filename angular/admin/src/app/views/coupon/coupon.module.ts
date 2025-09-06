import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CouponRoutingModule } from './coupon-routing.module';
import { CouponlistComponent } from './couponlist/couponlist.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { CouponaddeditComponent } from './couponaddedit/couponaddedit.component';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CouponviewComponent } from './couponview/couponview.component';
import { RouterModule, Routes } from '@angular/router';
import { CouponComponent } from './coupon.component';
import { ImageCropperModule } from 'ngx-image-cropper';

@NgModule({
  declarations: [
    CouponlistComponent,
    CouponaddeditComponent,
    CouponviewComponent,
    CouponComponent
  ],
  imports: [
    CommonModule,
    CouponRoutingModule,
    CommonTableModule,
    BsDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    ImageCropperModule
  ],
  exports: [RouterModule]
})
export class CouponModule { }
