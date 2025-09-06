import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMobileBannerComponent } from './add-mobile-banner.component';

describe('AddMobileBannerComponent', () => {
  let component: AddMobileBannerComponent;
  let fixture: ComponentFixture<AddMobileBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddMobileBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddMobileBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
