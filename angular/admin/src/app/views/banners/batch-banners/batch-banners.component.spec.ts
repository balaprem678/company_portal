import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchBannersComponent } from './batch-banners.component';

describe('BatchBannersComponent', () => {
  let component: BatchBannersComponent;
  let fixture: ComponentFixture<BatchBannersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BatchBannersComponent]
    });
    fixture = TestBed.createComponent(BatchBannersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
