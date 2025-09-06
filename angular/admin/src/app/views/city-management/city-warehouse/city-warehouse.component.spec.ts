import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityWarehouseComponent } from './city-warehouse.component';

describe('CityWarehouseComponent', () => {
  let component: CityWarehouseComponent;
  let fixture: ComponentFixture<CityWarehouseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CityWarehouseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CityWarehouseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
