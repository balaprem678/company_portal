import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnapproveddriverlistComponent } from './unapproveddriverlist.component';

describe('UnapproveddriverlistComponent', () => {
  let component: UnapproveddriverlistComponent;
  let fixture: ComponentFixture<UnapproveddriverlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnapproveddriverlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnapproveddriverlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
