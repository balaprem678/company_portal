import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterestlistComponent } from './interestlist.component';

describe('InterestlistComponent', () => {
  let component: InterestlistComponent;
  let fixture: ComponentFixture<InterestlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InterestlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InterestlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
