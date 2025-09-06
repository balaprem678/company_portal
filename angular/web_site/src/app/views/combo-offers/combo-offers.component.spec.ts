import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboOffersComponent } from './combo-offers.component';

describe('ComboOffersComponent', () => {
  let component: ComboOffersComponent;
  let fixture: ComponentFixture<ComboOffersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ComboOffersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboOffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
