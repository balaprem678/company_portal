import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileListBannerComponent } from './mobile-list-banner.component';

describe('MobileListBannerComponent', () => {
  let component: MobileListBannerComponent;
  let fixture: ComponentFixture<MobileListBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileListBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MobileListBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
