import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-reviews-rating-views',
  templateUrl: './reviews-rating-views.component.html',
  styleUrls: ['./reviews-rating-views.component.scss']
})
export class ReviewsRatingViewsComponent {
  pageTitle: string = "Reviews & Ratings";
  ReviewsDetails: any;
  rating_id: any;
  max: number = 5;
  readonly: boolean = true;
  env_url: string = environment.apiUrl;
  constructor(
    private ApiService: ApiService,
    private activateRoute: ActivatedRoute
  ) {
    this.activateRoute.params.subscribe(result => {
      if (result && result.id) {
        this.rating_id = result.id;
      }
    })
  }
  ngOnInit() {
    this.GetReviewDetails();
  }

  GetReviewDetails() {
    let data = {
      rating_id: this.rating_id
    }
    this.ApiService.CommonApi(Apiconfig.reviewsRatingDetails.method, Apiconfig.reviewsRatingDetails.url, data).subscribe(result => {
      if (result && result.status === 1) {
        this.ReviewsDetails = result.data;
        console.log(this.ReviewsDetails,"this.ReviewsDetailsthis.ReviewsDetails");
        
      }
    })
  }

}
