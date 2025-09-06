import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RattingQuesComponent } from './ratting-ques.component';

describe('RattingQuesComponent', () => {
  let component: RattingQuesComponent;
  let fixture: ComponentFixture<RattingQuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RattingQuesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RattingQuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
