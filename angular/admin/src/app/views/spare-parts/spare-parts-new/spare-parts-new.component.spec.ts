import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparePartsNewComponent } from './spare-parts-new.component';

describe('SparePartsNewComponent', () => {
  let component: SparePartsNewComponent;
  let fixture: ComponentFixture<SparePartsNewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SparePartsNewComponent]
    });
    fixture = TestBed.createComponent(SparePartsNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
