import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TempleteComponent } from './templete.component';

describe('TempleteComponent', () => {
  let component: TempleteComponent;
  let fixture: ComponentFixture<TempleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TempleteComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TempleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
