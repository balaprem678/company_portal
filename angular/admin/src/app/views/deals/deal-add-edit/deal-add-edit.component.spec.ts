import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DealAddEditComponent } from './deal-add-edit.component';

describe('DealAddEditComponent', () => {
  let component: DealAddEditComponent;
  let fixture: ComponentFixture<DealAddEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DealAddEditComponent]
    });
    fixture = TestBed.createComponent(DealAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
