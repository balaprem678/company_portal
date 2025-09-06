import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnAddeditComponent } from './return-addedit.component';

describe('ReturnAddeditComponent', () => {
  let component: ReturnAddeditComponent;
  let fixture: ComponentFixture<ReturnAddeditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReturnAddeditComponent]
    });
    fixture = TestBed.createComponent(ReturnAddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
