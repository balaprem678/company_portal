import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebatedetailsComponent } from './debatedetails.component';

describe('DebatedetailsComponent', () => {
  let component: DebatedetailsComponent;
  let fixture: ComponentFixture<DebatedetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebatedetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebatedetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
