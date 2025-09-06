import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxlistComponent } from './taxlist.component';

describe('TaxlistComponent', () => {
  let component: TaxlistComponent;
  let fixture: ComponentFixture<TaxlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TaxlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TaxlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
