import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TempleteAddeditComponent } from './templete-addedit.component';

describe('TempleteAddeditComponent', () => {
  let component: TempleteAddeditComponent;
  let fixture: ComponentFixture<TempleteAddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TempleteAddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TempleteAddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
