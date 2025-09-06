import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UseremailtemplateComponent } from './useremailtemplate.component';

describe('UseremailtemplateComponent', () => {
  let component: UseremailtemplateComponent;
  let fixture: ComponentFixture<UseremailtemplateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UseremailtemplateComponent]
    });
    fixture = TestBed.createComponent(UseremailtemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
