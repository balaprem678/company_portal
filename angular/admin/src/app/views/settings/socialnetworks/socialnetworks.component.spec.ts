import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialnetworksComponent } from './socialnetworks.component';

describe('SocialnetworksComponent', () => {
  let component: SocialnetworksComponent;
  let fixture: ComponentFixture<SocialnetworksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SocialnetworksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SocialnetworksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
