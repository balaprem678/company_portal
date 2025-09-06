import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostheaderListComponent } from './postheader-list.component';

describe('PostheaderListComponent', () => {
  let component: PostheaderListComponent;
  let fixture: ComponentFixture<PostheaderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PostheaderListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PostheaderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
