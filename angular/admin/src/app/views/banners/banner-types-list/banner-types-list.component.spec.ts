import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerTypesListComponent } from './banner-types-list.component';

describe('BannerTypesListComponent', () => {
  let component: BannerTypesListComponent;
  let fixture: ComponentFixture<BannerTypesListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BannerTypesListComponent]
    });
    fixture = TestBed.createComponent(BannerTypesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
