import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UseraddeditComponent } from './useraddedit.component';

describe('UseraddeditComponent', () => {
  let component: UseraddeditComponent;
  let fixture: ComponentFixture<UseraddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UseraddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UseraddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
