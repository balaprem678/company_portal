import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparePartsListComponent } from './spare-parts-list.component';

describe('SparePartsListComponent', () => {
  let component: SparePartsListComponent;
  let fixture: ComponentFixture<SparePartsListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SparePartsListComponent]
    });
    fixture = TestBed.createComponent(SparePartsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
