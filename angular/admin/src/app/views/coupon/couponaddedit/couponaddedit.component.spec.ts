import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CouponaddeditComponent } from './couponaddedit.component';

describe('CouponaddeditComponent', () => {
  let component: CouponaddeditComponent;
  let fixture: ComponentFixture<CouponaddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CouponaddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CouponaddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
