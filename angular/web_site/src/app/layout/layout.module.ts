import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { RouterModule } from "@angular/router";
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { SafehtmlPipe } from './safehtml.pipe';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { WarrantyPipe } from './warranty.pipe';
import { ViewsModule } from '../views/views.module';
import { NgxIntlTelInputModule } from '@khazii/ngx-intl-tel-input';




@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    SafehtmlPipe,
    WarrantyPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ModalModule.forRoot(),
    BsDropdownModule.forRoot(),
    ViewsModule,
    NgxIntlTelInputModule,
    
  ],
  exports:[
    HeaderComponent,
    FooterComponent
  ]
})
export class LayoutModule { }
