import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminearningsComponent } from './adminearnings.component';

describe('AdminearningsComponent', () => {
  let component: AdminearningsComponent;
  let fixture: ComponentFixture<AdminearningsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminearningsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminearningsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
