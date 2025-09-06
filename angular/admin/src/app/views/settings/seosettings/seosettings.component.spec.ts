import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeosettingsComponent } from './seosettings.component';

describe('SeosettingsComponent', () => {
  let component: SeosettingsComponent;
  let fixture: ComponentFixture<SeosettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SeosettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SeosettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
