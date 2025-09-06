import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceReportComponent } from './finance-report.component';

describe('FinanceReportComponent', () => {
  let component: FinanceReportComponent;
  let fixture: ComponentFixture<FinanceReportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FinanceReportComponent]
    });
    fixture = TestBed.createComponent(FinanceReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
