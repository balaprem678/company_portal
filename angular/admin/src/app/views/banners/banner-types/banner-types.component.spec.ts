import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerTypesComponent } from './banner-types.component';

describe('BannerTypesComponent', () => {
  let component: BannerTypesComponent;
  let fixture: ComponentFixture<BannerTypesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BannerTypesComponent]
    });
    fixture = TestBed.createComponent(BannerTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
