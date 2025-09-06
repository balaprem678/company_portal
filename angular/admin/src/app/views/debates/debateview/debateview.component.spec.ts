import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebateviewComponent } from './debateview.component';

describe('DebateviewComponent', () => {
  let component: DebateviewComponent;
  let fixture: ComponentFixture<DebateviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebateviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebateviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
