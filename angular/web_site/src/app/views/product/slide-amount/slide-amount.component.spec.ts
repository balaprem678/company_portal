import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlideAmountComponent } from './slide-amount.component';

describe('SlideAmountComponent', () => {
  let component: SlideAmountComponent;
  let fixture: ComponentFixture<SlideAmountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SlideAmountComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideAmountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
