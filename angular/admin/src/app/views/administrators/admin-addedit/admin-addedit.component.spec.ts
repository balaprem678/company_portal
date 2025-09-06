import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAddeditComponent } from './admin-addedit.component';

describe('AdminAddeditComponent', () => {
  let component: AdminAddeditComponent;
  let fixture: ComponentFixture<AdminAddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminAddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
