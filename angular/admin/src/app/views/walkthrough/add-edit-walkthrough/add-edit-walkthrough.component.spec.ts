import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditWalkthroughComponent } from './add-edit-walkthrough.component';

describe('AddEditWalkthroughComponent', () => {
  let component: AddEditWalkthroughComponent;
  let fixture: ComponentFixture<AddEditWalkthroughComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddEditWalkthroughComponent]
    });
    fixture = TestBed.createComponent(AddEditWalkthroughComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
