import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterestaddEditComponent } from './interestadd-edit.component';

describe('InterestaddEditComponent', () => {
  let component: InterestaddEditComponent;
  let fixture: ComponentFixture<InterestaddEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InterestaddEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InterestaddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
