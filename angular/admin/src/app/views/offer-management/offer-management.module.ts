import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OfferManagementRoutingModule } from './offer-management-routing.module';
import { OfferAddEditComponent } from './offer-add-edit/offer-add-edit.component';
import { OfferListComponent } from './offer-list/offer-list.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
    OfferAddEditComponent,
    OfferListComponent
  ],
  imports: [
    CommonModule,
    OfferManagementRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule
  ]
})
export class OfferManagementModule { }
