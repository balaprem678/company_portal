import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';

@Component({
  selector: 'popup-button-component',
  template: `
    <rating
      [(ngModel)]="rowData.rating"
      class="rating-star-view"
      [max]="max"
      [readonly]="readonly"
    ></rating>
  `,
})
export class RatingStarComponent {
  rowData: any;
  confirmModal: any;
  readonly: boolean = true;
  max: number = 5;
  @Input() value: any;

  @Output() save: EventEmitter<any> = new EventEmitter();
  constructor() {}
  onModelChange() {
    this.save.emit(this.rowData);
  }
}
