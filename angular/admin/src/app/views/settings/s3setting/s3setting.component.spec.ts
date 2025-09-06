import { ComponentFixture, TestBed } from '@angular/core/testing';

import { S3settingComponent } from './s3setting.component';

describe('S3settingComponent', () => {
  let component: S3settingComponent;
  let fixture: ComponentFixture<S3settingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ S3settingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(S3settingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
