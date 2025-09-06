import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BannersRoutingModule } from './banners-routing.module';
import { AddEditBannerComponent } from './add-edit-banner/add-edit-banner.component';
import { MobileListBannerComponent } from './mobile-list-banner/mobile-list-banner.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MobileBannerListComponent } from './mobile-banner-list/mobile-banner-list.component';
import { AddMobileBannerComponent } from './add-mobile-banner/add-mobile-banner.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { BannerTypesComponent } from './banner-types/banner-types.component';
import { BannerTypesListComponent } from './banner-types-list/banner-types-list.component';
import { BatchBannersComponent } from './batch-banners/batch-banners.component';


@NgModule({
  declarations: [
    AddEditBannerComponent,
    MobileListBannerComponent,
    MobileBannerListComponent,
    AddMobileBannerComponent,
    BannerTypesComponent,
    BannerTypesListComponent,
    BatchBannersComponent,
  ],
  imports: [
    CommonModule,
    BannersRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule
  ]
})
export class BannersModule { }
