import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserpendinglistComponent } from './userpendinglist.component';

describe('UserpendinglistComponent', () => {
  let component: UserpendinglistComponent;
  let fixture: ComponentFixture<UserpendinglistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserpendinglistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserpendinglistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
