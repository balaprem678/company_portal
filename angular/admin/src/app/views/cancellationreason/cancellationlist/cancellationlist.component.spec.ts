import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancellationlistComponent } from './cancellationlist.component';

describe('CancellationlistComponent', () => {
  let component: CancellationlistComponent;
  let fixture: ComponentFixture<CancellationlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CancellationlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CancellationlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
