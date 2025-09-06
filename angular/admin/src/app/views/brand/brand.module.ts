import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BrandRoutingModule } from './brand-routing.module';
import { AddBrandComponent } from './add-brand/add-brand.component';
import { BrandListComponent } from './brand-list/brand-list.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AddBrandComponent,
    BrandListComponent
  ],
  imports: [
    NgSelectModule,
    CommonModule,
    BrandRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [

  ]

})
export class BrandModule { }
