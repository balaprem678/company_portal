import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SparePartsRoutingModule } from './spare-parts-routing.module';
import { SparePartsListComponent } from './spare-parts-list/spare-parts-list.component';
import { SparePartsNewComponent } from './spare-parts-new/spare-parts-new.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
    
  
    SparePartsListComponent,
            SparePartsNewComponent
  ],
  imports: [
    CommonModule,
    SparePartsRoutingModule,
     FormsModule,
        ReactiveFormsModule,
        NgSelectModule
  ]
})
export class SparePartsModule { }
