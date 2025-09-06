import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewsRatingListComponent } from './reviews-rating-list.component';

describe('ReviewsRatingListComponent', () => {
  let component: ReviewsRatingListComponent;
  let fixture: ComponentFixture<ReviewsRatingListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReviewsRatingListComponent]
    });
    fixture = TestBed.createComponent(ReviewsRatingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
