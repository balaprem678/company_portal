import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddmaincategoryComponent } from './addmaincategory.component';

describe('AddmaincategoryComponent', () => {
  let component: AddmaincategoryComponent;
  let fixture: ComponentFixture<AddmaincategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddmaincategoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddmaincategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
