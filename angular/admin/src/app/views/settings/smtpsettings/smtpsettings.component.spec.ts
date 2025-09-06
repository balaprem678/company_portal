import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmtpsettingsComponent } from './smtpsettings.component';

describe('SmtpsettingsComponent', () => {
  let component: SmtpsettingsComponent;
  let fixture: ComponentFixture<SmtpsettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SmtpsettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SmtpsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
