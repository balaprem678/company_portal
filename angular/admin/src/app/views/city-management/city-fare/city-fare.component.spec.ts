import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityFareComponent } from './city-fare.component';

describe('CityFareComponent', () => {
  let component: CityFareComponent;
  let fixture: ComponentFixture<CityFareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CityFareComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CityFareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
