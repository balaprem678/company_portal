import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileBannerListComponent } from './mobile-banner-list.component';

describe('MobileBannerListComponent', () => {
  let component: MobileBannerListComponent;
  let fixture: ComponentFixture<MobileBannerListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileBannerListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MobileBannerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
