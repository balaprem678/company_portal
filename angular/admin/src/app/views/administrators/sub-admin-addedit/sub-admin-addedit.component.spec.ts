import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubAdminAddeditComponent } from './sub-admin-addedit.component';

describe('SubAdminAddeditComponent', () => {
  let component: SubAdminAddeditComponent;
  let fixture: ComponentFixture<SubAdminAddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubAdminAddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubAdminAddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
