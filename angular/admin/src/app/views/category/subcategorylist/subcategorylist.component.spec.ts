import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubcategorylistComponent } from './subcategorylist.component';

describe('SubcategorylistComponent', () => {
  let component: SubcategorylistComponent;
  let fixture: ComponentFixture<SubcategorylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubcategorylistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubcategorylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
