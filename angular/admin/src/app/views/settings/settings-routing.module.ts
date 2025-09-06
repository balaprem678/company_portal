import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppearanceComponent } from './appearance/appearance.component';
import { DebatesettingsComponent } from './debatesettings/debatesettings.component';
import { GentralsettingsComponent } from './gentralsettings/gentralsettings.component';
import { PostheaderAddeditComponent } from './postheader/postheader-addedit/postheader-addedit.component';
import { PostheaderListComponent } from './postheader/postheader-list/postheader-list.component';
import { S3settingComponent } from './s3setting/s3setting.component';
import { SeosettingsComponent } from './seosettings/seosettings.component';
import { SettingsComponent } from './settings.component';
import { SmsComponent } from './sms/sms.component';
import { SmtpsettingsComponent } from './smtpsettings/smtpsettings.component';
import { SocialnetworksComponent } from './socialnetworks/socialnetworks.component';
import { WidgetsComponent } from './widgets/widgets.component';
import { ReturnReasonComponent } from './return-reason/return-reason.component';
import { ReturnReasonListComponent } from './return-reasons/return-reason-list/return-reason-list.component';
import { ReturnAddeditComponent } from './return-reasons/return-addedit/return-addedit.component';
import { ShippingComponent } from './shipping/shipping.component';
const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      {
        path: 'gentralsetting',
        component: GentralsettingsComponent,
        data: {
          title: 'General Setting'
        }
      },
      {
        path: 'shipping',
        component: ShippingComponent,
        data: {
          title: 'Shipping'
        }
      },
      {
        path: 'smtpsetting',
        component: SmtpsettingsComponent,
        data: {
          title: 'SMTP Setting'
        }
      },
      {
        path: 'smssetting',
        component: SmsComponent,
        data: {
          title: 'SMS Setting'
        }
      },
      {
        path: 'debate-setting',
        component: DebatesettingsComponent,
        data: {
          title: 'Debate Setting'
        }
      },
      {
        path: 's3-setting',
        component: S3settingComponent,
        data: {
          title: 'S3 Setting'
        }
      },
      {
        path: 'social-network',
        component: SocialnetworksComponent,
        data: {
          title: 'Social Network Setting'
        }
      },
    
      {
        path: 'return-reason',
        component:  ReturnAddeditComponent,
        data: {
          title: 'Return Reason setting'
        }
      },
      {
        path: 'seosetting',
        component: SeosettingsComponent,
        data: {
          title: 'SEO Setting'
        }
      },
      {
        path: 'appearance',
        component: AppearanceComponent,
        data: {
          title: 'Appearance Setting'
        }
      },
      {
        path: 'postheaderlist',
        component: PostheaderListComponent,
        data: {
          title: 'PostHeader List'
        }
      },
      {
        path: 'postheaderadd',
        component: PostheaderAddeditComponent,
        data: {
          title: 'PostHeader Add'
        }
      },
      {
        path: 'postheaderedit/:id',
        component: PostheaderAddeditComponent,
        data: {
          title: 'PostHeader Edit'
        }
      },
      {
        path: 'widgets',
        component: WidgetsComponent,
        data: {
          title: 'Widgets'
        }
      },
      {
        path: '',
        redirectTo: 'gentralsetting',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
