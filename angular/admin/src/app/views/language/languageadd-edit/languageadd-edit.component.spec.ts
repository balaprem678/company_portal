import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageaddEditComponent } from './languageadd-edit.component';

describe('LanguageaddEditComponent', () => {
  let component: LanguageaddEditComponent;
  let fixture: ComponentFixture<LanguageaddEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LanguageaddEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LanguageaddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
