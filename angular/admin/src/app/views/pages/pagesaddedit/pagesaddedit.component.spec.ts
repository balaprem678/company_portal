import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagesaddeditComponent } from './pagesaddedit.component';

describe('PagesaddeditComponent', () => {
  let component: PagesaddeditComponent;
  let fixture: ComponentFixture<PagesaddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PagesaddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PagesaddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
