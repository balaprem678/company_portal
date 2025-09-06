import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailtempletelistComponent } from './emailtempletelist.component';

describe('EmailtempletelistComponent', () => {
  let component: EmailtempletelistComponent;
  let fixture: ComponentFixture<EmailtempletelistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmailtempletelistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailtempletelistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
