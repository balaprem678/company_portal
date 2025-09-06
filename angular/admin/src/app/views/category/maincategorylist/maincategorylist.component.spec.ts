import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaincategorylistComponent } from './maincategorylist.component';

describe('MaincategorylistComponent', () => {
  let component: MaincategorylistComponent;
  let fixture: ComponentFixture<MaincategorylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaincategorylistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaincategorylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
