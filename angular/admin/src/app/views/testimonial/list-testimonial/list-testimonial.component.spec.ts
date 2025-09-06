import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTestimonialComponent } from './list-testimonial.component';

describe('ListTestimonialComponent', () => {
  let component: ListTestimonialComponent;
  let fixture: ComponentFixture<ListTestimonialComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListTestimonialComponent]
    });
    fixture = TestBed.createComponent(ListTestimonialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
