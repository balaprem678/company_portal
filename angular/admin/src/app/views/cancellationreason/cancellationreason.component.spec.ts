import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancellationreasonComponent } from './cancellationreason.component';

describe('CancellationreasonComponent', () => {
  let component: CancellationreasonComponent;
  let fixture: ComponentFixture<CancellationreasonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CancellationreasonComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CancellationreasonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
