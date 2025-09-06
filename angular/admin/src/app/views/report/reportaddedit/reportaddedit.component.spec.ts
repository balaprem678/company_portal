import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportaddeditComponent } from './reportaddedit.component';

describe('ReportaddeditComponent', () => {
  let component: ReportaddeditComponent;
  let fixture: ComponentFixture<ReportaddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportaddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportaddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
