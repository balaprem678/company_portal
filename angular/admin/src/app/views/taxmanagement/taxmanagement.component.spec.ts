import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxmanagementComponent } from './taxmanagement.component';

describe('TaxmanagementComponent', () => {
  let component: TaxmanagementComponent;
  let fixture: ComponentFixture<TaxmanagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TaxmanagementComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TaxmanagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
