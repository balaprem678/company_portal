import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminearningslistComponent } from './adminearningslist.component';

describe('AdminearningslistComponent', () => {
  let component: AdminearningslistComponent;
  let fixture: ComponentFixture<AdminearningslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminearningslistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminearningslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
