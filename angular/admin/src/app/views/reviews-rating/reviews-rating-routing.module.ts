import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReviewsRatingListComponent } from './reviews-rating-list/reviews-rating-list.component';
import { ReviewsRatingViewsComponent } from './reviews-rating-views/reviews-rating-views.component';

const routes: Routes = [
  {
    path:"list",
    component:ReviewsRatingListComponent
  },{
    path:"views/:id",
    component:ReviewsRatingViewsComponent
  },{
    path:"",
    redirectTo:"list",
    pathMatch:"full"
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReviewsRatingRoutingModule { }
