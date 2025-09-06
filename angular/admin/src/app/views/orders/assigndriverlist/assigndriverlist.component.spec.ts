import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssigndriverlistComponent } from './assigndriverlist.component';

describe('AssigndriverlistComponent', () => {
  let component: AssigndriverlistComponent;
  let fixture: ComponentFixture<AssigndriverlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssigndriverlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssigndriverlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
