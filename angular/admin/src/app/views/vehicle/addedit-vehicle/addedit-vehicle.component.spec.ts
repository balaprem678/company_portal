import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddeditVehicleComponent } from './addedit-vehicle.component';

describe('AddeditVehicleComponent', () => {
  let component: AddeditVehicleComponent;
  let fixture: ComponentFixture<AddeditVehicleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddeditVehicleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddeditVehicleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
