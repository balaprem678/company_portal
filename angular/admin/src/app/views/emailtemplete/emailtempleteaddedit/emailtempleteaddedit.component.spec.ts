import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailtempleteaddeditComponent } from './emailtempleteaddedit.component';

describe('EmailtempleteaddeditComponent', () => {
  let component: EmailtempleteaddeditComponent;
  let fixture: ComponentFixture<EmailtempleteaddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmailtempleteaddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailtempleteaddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
