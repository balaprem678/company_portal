import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveEmployeesComponent } from './active-employees.component';

describe('ActiveEmployeesComponent', () => {
  let component: ActiveEmployeesComponent;
  let fixture: ComponentFixture<ActiveEmployeesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ActiveEmployeesComponent]
    });
    fixture = TestBed.createComponent(ActiveEmployeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
