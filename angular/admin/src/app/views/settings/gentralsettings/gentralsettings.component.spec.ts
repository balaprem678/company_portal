import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GentralsettingsComponent } from './gentralsettings.component';

describe('GentralsettingsComponent', () => {
  let component: GentralsettingsComponent;
  let fixture: ComponentFixture<GentralsettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GentralsettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GentralsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
