import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RattingQuesAddeditComponent } from './ratting-ques-addedit.component';

describe('RattingQuesAddeditComponent', () => {
  let component: RattingQuesAddeditComponent;
  let fixture: ComponentFixture<RattingQuesAddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RattingQuesAddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RattingQuesAddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
