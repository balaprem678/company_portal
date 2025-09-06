import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ViewsRoutingModule } from './views-routing.module';
import { ViewsComponent } from './views.component';
import {
  AppAsideModule,
  AppBreadcrumbModule,
  AppHeaderModule,
  AppFooterModule,
  AppSidebarModule,
} from "src/app/layout/public-api";
import { NgScrollbarModule } from 'ngx-scrollbar';
// import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { RouterModule } from '@angular/router';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { SpinnerComponent } from 'src/app/shared/spinner/spinner.component';
import { BrandComponent } from './brand/brand.component';
import { BannersComponent } from './banners/banners.component';
import { TaxmanagementComponent } from './taxmanagement/taxmanagement.component';
import { UnitsComponent } from './units/units.component';
import { OrdersComponent } from './orders/orders.component';
// import { MapViewComponent } from './map-view/map-view.component';
import { environment } from 'src/environments/environment';
// import { AgmCoreModule } from '@agm/core';
import { CancellationreasonComponent } from './cancellationreason/cancellationreason.component';
import { AdminearningsComponent } from './adminearnings/adminearnings.component';
import { DocumentManagementComponent } from './document-management/document-management.component';
import { TimeSlotsComponent } from './time-slots/time-slots.component';
import { DriversComponent } from './drivers/drivers.component';
import { FormsModule } from '@angular/forms';
// import { AgmOverlays } from "agm-overlays"
// import { AgmDirectionModule } from 'agm-direction';
import { CityManagementComponent } from './city-management/city-management.component';
import { CommonTableModule } from '../common-table/common-table.module';
import { TimeagoModule } from 'ngx-timeago';
import { LayoutModule } from '../layout/lib/shared';
import { WalkthroughComponent } from './walkthrough/walkthrough.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { FaqManagementComponent } from './faq-management/faq-management.component';
// import { FleetaddComponent } from './fleet/fleetadd/fleetadd.component';


@NgModule({
  declarations: [
    ViewsComponent, SpinnerComponent, BrandComponent, BannersComponent, UnitsComponent, OrdersComponent, TaxmanagementComponent, /* MapViewComponent, */ DocumentManagementComponent, CancellationreasonComponent, AdminearningsComponent, TimeSlotsComponent, DriversComponent, CityManagementComponent, WalkthroughComponent, FaqManagementComponent,  
  ],
  imports: [
    CommonModule,
    ViewsRoutingModule,
    AppAsideModule,
    AppBreadcrumbModule,
    AppHeaderModule,
    AppFooterModule,
    AppSidebarModule,
    // PerfectScrollbarModule,
    // NgScrollbarModule,
    AccordionModule.forRoot(),
    TimeagoModule.forRoot(),
    // PerfectScrollbarModule,
    BsDropdownModule.forRoot(),
    TabsModule.forRoot(),
    RouterModule,
    // AgmCoreModule.forRoot({
    //   apiKey: environment.mapKey,
    //   libraries: ["places"]
    // }),
    FormsModule,
    // AgmOverlays,
    // AgmDirectionModule,
    CommonTableModule,
    LayoutModule,
    ModalModule.forRoot(),
  ]
})
export class ViewsModule { }
