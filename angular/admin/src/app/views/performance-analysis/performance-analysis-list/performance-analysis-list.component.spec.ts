import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceAnalysisListComponent } from './performance-analysis-list.component';

describe('PerformanceAnalysisListComponent', () => {
  let component: PerformanceAnalysisListComponent;
  let fixture: ComponentFixture<PerformanceAnalysisListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PerformanceAnalysisListComponent]
    });
    fixture = TestBed.createComponent(PerformanceAnalysisListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
