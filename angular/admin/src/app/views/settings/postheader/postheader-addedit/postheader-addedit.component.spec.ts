import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostheaderAddeditComponent } from './postheader-addedit.component';

describe('PostheaderAddeditComponent', () => {
  let component: PostheaderAddeditComponent;
  let fixture: ComponentFixture<PostheaderAddeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PostheaderAddeditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PostheaderAddeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
