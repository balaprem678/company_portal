import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboAddEditComponent } from './combo-add-edit.component';

describe('ComboAddEditComponent', () => {
  let component: ComboAddEditComponent;
  let fixture: ComponentFixture<ComboAddEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ComboAddEditComponent]
    });
    fixture = TestBed.createComponent(ComboAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
