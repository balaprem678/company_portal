import { Component, EventEmitter, OnInit, Output } from '@angular/core';
// import { Options } from '@angular-slider/ngx-slider';
import { Options } from 'ngx-slider-v2';

@Component({
  selector: 'app-slide-amount',
  templateUrl: './slide-amount.component.html',
  styleUrls: ['./slide-amount.component.scss']
})
export class SlideAmountComponent implements OnInit {
  @Output() onChangeSlider: EventEmitter<any> = new EventEmitter();
  minValue = 1000;
  maxValue = 100000;
  options: Options = {
    floor: 0,
    ceil: 101000,

    showTicks: true
  };
  constructor() { }

  ngOnInit(): void {
  }

  onSliderChange(event){
    console.log("event", event)
    var data = {
      minValuu: this.minValue,
      maxValue: this.maxValue,
    }
    this.onChangeSlider.emit(data);
  }

}
