import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverlandingpageComponent } from './driverlandingpage.component';

describe('DriverlandingpageComponent', () => {
  let component: DriverlandingpageComponent;
  let fixture: ComponentFixture<DriverlandingpageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DriverlandingpageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DriverlandingpageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
