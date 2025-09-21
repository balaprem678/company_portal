import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { TestimonialRoutingModule } from './testimonial-routing.module';
import { AddEditTestimonialComponent } from './add-edit-testimonial/add-edit-testimonial.component';
import { ListTestimonialComponent } from './list-testimonial/list-testimonial.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonTableModule } from '../../common-table/common-table.module';
import { AssignmentComponent } from './assignment/assignment.component';

@NgModule({
  declarations: [
    AddEditTestimonialComponent,
    ListTestimonialComponent,
    AssignmentComponent
  ],
  imports: [
    CommonTableModule,
    CommonModule,
    TestimonialRoutingModule,
    // BrowserModule,
    FormsModule,
    NgSelectModule
  ]
})
export class TestimonialModule { }
