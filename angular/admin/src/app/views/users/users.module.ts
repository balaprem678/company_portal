import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';
import { UserlistComponent } from './userlist/userlist.component';
import { UseraddeditComponent } from './useraddedit/useraddedit.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxIntlTelInputModule } from '@khazii/ngx-intl-tel-input';
import { ImageCropperModule } from 'ngx-image-cropper';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { UserpendinglistComponent } from './userpendinglist/userpendinglist.component';
import { environment } from 'src/environments/environment';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { UseremailtemplateComponent } from './useremailtemplate/useremailtemplate.component';
import { AngularEditorModule } from '@kolkov/angular-editor';
// import { SpinnerComponent } from 'src/app/shared/spinner/spinner.component';

@NgModule({
  declarations: [
    UsersComponent,
    UserlistComponent,
    UseraddeditComponent,
    UserpendinglistComponent,
    UseremailtemplateComponent,
    // SpinnerComponent
  ],
  imports: [
    CommonModule,
    UsersRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule,
    NgxIntlTelInputModule,
    ImageCropperModule,
    NgSelectModule,
    CommonTableModule,
    AngularEditorModule,
    TabsModule.forRoot(),
    BsDatepickerModule.forRoot(),
    // AgmCoreModule.forRoot({
    //   apiKey: environment.mapKey,
    //   libraries: ["places"]
    // }),
    ModalModule.forRoot(),
  ]
})
export class UsersModule { }
