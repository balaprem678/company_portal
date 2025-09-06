import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityAddAreaComponent } from './city-add-area.component';

describe('CityAddAreaComponent', () => {
  let component: CityAddAreaComponent;
  let fixture: ComponentFixture<CityAddAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CityAddAreaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CityAddAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
