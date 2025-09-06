import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FuelRecordsListComponent } from './fuel-records-list.component';

describe('FuelRecordsListComponent', () => {
  let component: FuelRecordsListComponent;
  let fixture: ComponentFixture<FuelRecordsListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FuelRecordsListComponent]
    });
    fixture = TestBed.createComponent(FuelRecordsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
