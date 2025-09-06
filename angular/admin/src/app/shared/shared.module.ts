import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StarButtonComponent } from './star-button.component';
import { SafeHtmlPipe } from './safeHtml';
import { ButtonComponent } from './button.component';
import { CommonModalComponent } from './common-modal.component';
import { FeaturedComponent } from './featured.component';
import { PopupComponent } from './popup.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { EditPriceComponent } from './editPrice.component';
import { CloneComponent } from './clone.component';
import { CustomComponent } from './custom.component';
import { Assign_driverComponent } from './assign_driver';
import { ApporveComponent } from './apporve.component';
import { ExpensiveComponent } from './expensive.component';
import { OrderManageComponent } from './order-manage.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { SendmailComponent } from './sendmail.component';
import { RatingStarComponent } from './ratingStar.component';
import { RatingModule } from 'ngx-bootstrap/rating';
import { OrderCancelComponent } from './order-cancel-componet';
import { viewdetailsComponent } from './view-details.component';
import { PopupflagComponent } from './popupflag.component';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { AngularEditorConfig } from '@kolkov/angular-editor';


@NgModule({
  declarations: [
    StarButtonComponent,
    SafeHtmlPipe,
    ButtonComponent,
    CommonModalComponent,
    FeaturedComponent,
    PopupComponent,
    PopupflagComponent,
    EditPriceComponent,
    CloneComponent,
    CustomComponent,
    Assign_driverComponent,
    ApporveComponent,
    ExpensiveComponent,
    FeaturedComponent,
    OrderManageComponent,
    SendmailComponent,
    RatingStarComponent,
    OrderCancelComponent,
    viewdetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularEditorModule,
    ModalModule.forRoot(),
    NgSelectModule,
    RatingModule.forRoot(),
  ],
  exports: [
    StarButtonComponent,
    SafeHtmlPipe,
    ButtonComponent,
    CommonModalComponent,
    FeaturedComponent,
    PopupComponent,
    PopupflagComponent,

    EditPriceComponent,
    CloneComponent,
    CustomComponent,
    Assign_driverComponent,
    ApporveComponent,
    ExpensiveComponent,
    FeaturedComponent,
    OrderManageComponent,
    SendmailComponent,
    RatingStarComponent,
    OrderCancelComponent
  ],
})
export class SharedModule { }
