import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionaddEditComponent } from './subscriptionadd-edit.component';

describe('SubscriptionaddEditComponent', () => {
  let component: SubscriptionaddEditComponent;
  let fixture: ComponentFixture<SubscriptionaddEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubscriptionaddEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubscriptionaddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
