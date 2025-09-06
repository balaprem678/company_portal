import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancellationviewComponent } from './cancellationview.component';

describe('CancellationviewComponent', () => {
  let component: CancellationviewComponent;
  let fixture: ComponentFixture<CancellationviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CancellationviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CancellationviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
