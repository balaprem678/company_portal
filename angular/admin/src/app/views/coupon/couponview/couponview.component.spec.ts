import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CouponviewComponent } from './couponview.component';

describe('CouponviewComponent', () => {
  let component: CouponviewComponent;
  let fixture: ComponentFixture<CouponviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CouponviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CouponviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
