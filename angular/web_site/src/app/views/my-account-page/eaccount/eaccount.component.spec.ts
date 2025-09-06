import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EaccountComponent } from './eaccount.component';

describe('EaccountComponent', () => {
  let component: EaccountComponent;
  let fixture: ComponentFixture<EaccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EaccountComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EaccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
