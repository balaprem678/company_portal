import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PackedordersComponent } from './packedorders.component';

describe('PackedordersComponent', () => {
  let component: PackedordersComponent;
  let fixture: ComponentFixture<PackedordersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PackedordersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PackedordersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
