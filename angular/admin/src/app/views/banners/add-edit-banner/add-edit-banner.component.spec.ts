import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditBannerComponent } from './add-edit-banner.component';

describe('AddEditBannerComponent', () => {
  let component: AddEditBannerComponent;
  let fixture: ComponentFixture<AddEditBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddEditBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
