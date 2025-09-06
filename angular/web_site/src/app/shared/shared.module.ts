import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from './spinner/spinner.component';
import { RouterModule } from "@angular/router";
import { UsersCountPipe } from './users-count.pipe';
import { DealsComponent } from './deals/deals.component';
import { NgxSliderModule } from 'ngx-slider-v2';
import { ViewsRoutingModule } from '../views/views-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { NgbCarouselModule } from '@ng-bootstrap/ng-bootstrap';


@NgModule({
  declarations: [
    SpinnerComponent,
    UsersCountPipe,
    DealsComponent,
    
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgxSliderModule,
    CommonModule,
    RouterModule,
    ViewsRoutingModule,
    ReactiveFormsModule,
    SlickCarouselModule,
    FormsModule,
    NgbCarouselModule,


  ],
  exports:[
    SpinnerComponent,
    DealsComponent,
    UsersCountPipe
  ]
})
export class SharedModule { }
