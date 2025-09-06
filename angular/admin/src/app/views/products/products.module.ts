import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductsRoutingModule } from './products-routing.module';
import { ProductsComponent } from './products.component';
import { ProductlistComponent } from './productlist/productlist.component';
import { AddeditproductComponent } from './addeditproduct/addeditproduct.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ImageCropperModule } from 'ngx-image-cropper';

@NgModule({
  declarations: [
    ProductsComponent,
    ProductlistComponent,
    AddeditproductComponent
  ],
  imports: [
    CommonModule,
    ProductsRoutingModule,
    CommonTableModule,
    NgSelectModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    ModalModule.forRoot(),
    ImageCropperModule
  ]
})
export class ProductsModule { }
