import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditUnitsComponent } from './add-edit-units.component';

describe('AddEditUnitsComponent', () => {
  let component: AddEditUnitsComponent;
  let fixture: ComponentFixture<AddEditUnitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddEditUnitsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditUnitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
