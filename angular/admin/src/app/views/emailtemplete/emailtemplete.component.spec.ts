import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailtempleteComponent } from './emailtemplete.component';

describe('EmailtempleteComponent', () => {
  let component: EmailtempleteComponent;
  let fixture: ComponentFixture<EmailtempleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmailtempleteComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailtempleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
