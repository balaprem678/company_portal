import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverorderlistComponent } from './driverorderlist.component';

describe('DriverorderlistComponent', () => {
  let component: DriverorderlistComponent;
  let fixture: ComponentFixture<DriverorderlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DriverorderlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DriverorderlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
