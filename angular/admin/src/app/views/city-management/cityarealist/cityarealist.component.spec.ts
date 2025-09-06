import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityarealistComponent } from './cityarealist.component';

describe('CityarealistComponent', () => {
  let component: CityarealistComponent;
  let fixture: ComponentFixture<CityarealistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CityarealistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CityarealistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
