import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsercancelledordersComponent } from './usercancelledorders.component';

describe('UsercancelledordersComponent', () => {
  let component: UsercancelledordersComponent;
  let fixture: ComponentFixture<UsercancelledordersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UsercancelledordersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsercancelledordersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
