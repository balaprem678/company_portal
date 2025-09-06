import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InterestRoutingModule } from './interest-routing.module';
import { InterestComponent } from './interest.component';
import { InterestlistComponent } from './interestlist/interestlist.component';
import { InterestaddEditComponent } from './interestadd-edit/interestadd-edit.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ImageCropperModule } from 'ngx-image-cropper';

@NgModule({
  declarations: [
    InterestComponent,
    InterestlistComponent,
    InterestaddEditComponent
  ],
  imports: [
    CommonModule,
    InterestRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ImageCropperModule
  ]
})
export class InterestModule { }
