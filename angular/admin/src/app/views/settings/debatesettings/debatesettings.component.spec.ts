import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebatesettingsComponent } from './debatesettings.component';

describe('DebatesettingsComponent', () => {
  let component: DebatesettingsComponent;
  let fixture: ComponentFixture<DebatesettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebatesettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebatesettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
