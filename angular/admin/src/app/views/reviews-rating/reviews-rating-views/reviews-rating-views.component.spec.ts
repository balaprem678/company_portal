import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewsRatingViewsComponent } from './reviews-rating-views.component';

describe('ReviewsRatingViewsComponent', () => {
  let component: ReviewsRatingViewsComponent;
  let fixture: ComponentFixture<ReviewsRatingViewsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReviewsRatingViewsComponent]
    });
    fixture = TestBed.createComponent(ReviewsRatingViewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
