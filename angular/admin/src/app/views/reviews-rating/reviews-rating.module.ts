import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReviewsRatingRoutingModule } from './reviews-rating-routing.module';
import { ReviewsRatingListComponent } from './reviews-rating-list/reviews-rating-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { ReviewsRatingViewsComponent } from './reviews-rating-views/reviews-rating-views.component';
import { RatingModule } from 'ngx-bootstrap/rating';


@NgModule({
  declarations: [
    ReviewsRatingListComponent,
    ReviewsRatingViewsComponent
  ],
  imports: [
    CommonModule,
    ReviewsRatingRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
    RatingModule.forRoot()
  ]
})
export class ReviewsRatingModule { }
