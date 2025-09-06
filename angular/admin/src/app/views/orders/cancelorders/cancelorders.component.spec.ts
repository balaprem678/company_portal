import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelordersComponent } from './cancelorders.component';

describe('CancelordersComponent', () => {
  let component: CancelordersComponent;
  let fixture: ComponentFixture<CancelordersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CancelordersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CancelordersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
