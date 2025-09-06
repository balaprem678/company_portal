import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancellationaddeditComponent } from './cancellationaddedit.component';

describe('CancellationaddeditComponent', () => {
  let component: CancellationaddeditComponent;
  let fixture: ComponentFixture<CancellationaddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CancellationaddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CancellationaddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
