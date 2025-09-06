import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnViewComponent } from './return-view.component';

describe('ReturnViewComponent', () => {
  let component: ReturnViewComponent;
  let fixture: ComponentFixture<ReturnViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReturnViewComponent]
    });
    fixture = TestBed.createComponent(ReturnViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
