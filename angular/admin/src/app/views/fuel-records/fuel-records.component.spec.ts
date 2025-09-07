import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FuelRecordsComponent } from './fuel-records.component';

describe('FuelRecordsComponent', () => {
  let component: FuelRecordsComponent;
  let fixture: ComponentFixture<FuelRecordsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FuelRecordsComponent]
    });
    fixture = TestBed.createComponent(FuelRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
