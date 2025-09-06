import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCropperModule } from 'ngx-image-cropper';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { GentralsettingsComponent } from './gentralsettings/gentralsettings.component';
import { SmtpsettingsComponent } from './smtpsettings/smtpsettings.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SmsComponent } from './sms/sms.component';
import { DebatesettingsComponent } from './debatesettings/debatesettings.component';
import { S3settingComponent } from './s3setting/s3setting.component';
import { SocialnetworksComponent } from './socialnetworks/socialnetworks.component';
import { SeosettingsComponent } from './seosettings/seosettings.component';
import { AppearanceComponent } from './appearance/appearance.component';
// import { PostheaderComponent } from './postheader/postheader.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { PostheaderAddeditComponent } from './postheader/postheader-addedit/postheader-addedit.component';
import { PostheaderListComponent } from './postheader/postheader-list/postheader-list.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { WidgetsComponent } from './widgets/widgets.component';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { ReturnReasonComponent } from './return-reason/return-reason.component';
import { ReturnAddeditComponent } from './return-reasons/return-addedit/return-addedit.component';
import { ReturnReasonListComponent } from './return-reasons/return-reason-list/return-reason-list.component';
import { ShippingComponent } from './shipping/shipping.component';

@NgModule({
  declarations: [
    SettingsComponent,
    GentralsettingsComponent,
    SmtpsettingsComponent,
    SmsComponent,
    DebatesettingsComponent,
    S3settingComponent,
    SocialnetworksComponent,
    SeosettingsComponent,
    AppearanceComponent,
    // PostheaderComponent,
    PostheaderAddeditComponent,
    PostheaderListComponent,
    WidgetsComponent,
    ReturnReasonComponent,
    ReturnAddeditComponent,
    ReturnReasonListComponent,
    ShippingComponent
  ],
  imports: [
    CommonModule,
    SettingsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    RouterModule,
    ImageCropperModule,
    CommonTableModule,
    TabsModule,
    AngularEditorModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingsModule { }
