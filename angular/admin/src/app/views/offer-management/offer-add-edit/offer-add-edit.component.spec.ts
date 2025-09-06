import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferAddEditComponent } from './offer-add-edit.component';

describe('OfferAddEditComponent', () => {
  let component: OfferAddEditComponent;
  let fixture: ComponentFixture<OfferAddEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OfferAddEditComponent]
    });
    fixture = TestBed.createComponent(OfferAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
