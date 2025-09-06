import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebatelistComponent } from './debatelist.component';

describe('DebatelistComponent', () => {
  let component: DebatelistComponent;
  let fixture: ComponentFixture<DebatelistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebatelistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebatelistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
