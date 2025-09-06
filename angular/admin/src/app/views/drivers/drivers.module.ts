import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DriversRoutingModule } from './drivers-routing.module';
import { DriverslistComponent } from './driverslist/driverslist.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { DriversviewComponent } from './driversview/driversview.component';
import { AddeditComponent } from './addedit/addedit.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxIntlTelInputModule } from '@khazii/ngx-intl-tel-input';
import { environment } from 'src/environments/environment';
import { ImageCropperModule } from 'ngx-image-cropper';
import { UnapproveddriverlistComponent } from './unapproveddriverlist/unapproveddriverlist.component';
import { DriverdashboardComponent } from './driverdashboard/driverdashboard.component';
import { NgChartsModule } from 'ng2-charts';
import { DriverorderlistComponent } from './driverorderlist/driverorderlist.component';
import { TabsModule } from 'ngx-bootstrap/tabs';




@NgModule({
  declarations: [
    DriverslistComponent,
    DriversviewComponent,
    AddeditComponent,
    UnapproveddriverlistComponent,
    DriverdashboardComponent,
    DriverorderlistComponent
  ],
  imports: [
    CommonModule,
    DriversRoutingModule,
    CommonTableModule,
    NgSelectModule,
    FormsModule,
    ReactiveFormsModule,
    NgxIntlTelInputModule,
    // AgmCoreModule.forRoot({
    //   apiKey: environment.mapKey,
    //   libraries: ["places"]
    // }),
    ImageCropperModule,
    NgChartsModule,
    TabsModule.forRoot()

  ]
})
export class DriversModule { }
