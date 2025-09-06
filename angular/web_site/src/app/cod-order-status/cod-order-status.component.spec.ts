import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodOrderStatusComponent } from './cod-order-status.component';

describe('CodOrderStatusComponent', () => {
  let component: CodOrderStatusComponent;
  let fixture: ComponentFixture<CodOrderStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CodOrderStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodOrderStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
