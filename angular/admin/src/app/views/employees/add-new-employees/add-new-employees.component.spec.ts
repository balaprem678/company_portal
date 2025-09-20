import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewEmployeesComponent } from './add-new-employees.component';

describe('AddNewEmployeesComponent', () => {
  let component: AddNewEmployeesComponent;
  let fixture: ComponentFixture<AddNewEmployeesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddNewEmployeesComponent]
    });
    fixture = TestBed.createComponent(AddNewEmployeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
