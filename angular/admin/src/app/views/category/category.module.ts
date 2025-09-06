import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CategoryRoutingModule } from './category-routing.module';
import { CategoryComponent } from './category.component';
import { MaincategorylistComponent } from './maincategorylist/maincategorylist.component';
import { SubcategorylistComponent } from './subcategorylist/subcategorylist.component';
import { AddsubcategoryComponent } from './addsubcategory/addsubcategory.component';
import { AddmaincategoryComponent } from './addmaincategory/addmaincategory.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ImageCropperModule } from 'ngx-image-cropper';

@NgModule({
  declarations: [
    CategoryComponent,
    MaincategorylistComponent,
    SubcategorylistComponent,
    AddsubcategoryComponent,
    AddmaincategoryComponent
  ],
  imports: [
    CommonModule,
    CategoryRoutingModule,
    CommonTableModule,
    NgSelectModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    ImageCropperModule,
    ModalModule.forRoot()
  ]
})
export class CategoryModule { }
