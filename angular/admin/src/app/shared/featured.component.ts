import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';

@Component({
  selector: 'featured-button-component',
  template: `
    <span
      style="cursor: pointer;"
      class="btn app-close"
      *ngIf="rowData && rowData.feature == 1"
      (click)="confirmModal.show()"
      >Featured</span
    ><span
      style="cursor: pointer;"
      class="btn app-closedd"
      (click)="confirmModal.show()"
      *ngIf="rowData && rowData.feature == 0"
      >Un Featured</span
    >
    <div
      bsModal
      #confirmModal="bs-modal"
      class="modal fade"
      id="exampleModalCenter"
      tabindex="-1"
      role="dialog"
      aria-labelledby="exampleModalCenterTitle"
      aria-hidden="true"
    >
      <div class="featured_unfeatured_modal modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content cases-model">
          <h5 class="modal-title" id="exampleModalLongTitle">Change Status</h5>
          <h6>Are you sure! Do you want to Change Feature?</h6>
          <div class="yes_no">
            <button type="button" class="btn " (click)="confirmModal.hide()">
              No
            </button>
            <button type="button" class="btn " (click)="onModelChange()">
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class FeaturedComponent {
  rowData: any;

  @Input() value: any;

  @Output() save: EventEmitter<any> = new EventEmitter();
  onModelChange() {
    this.save.emit(this.rowData);
  }
}

// <span class="start-rate" * ngIf="!rowData.rcatname" >
//     <div class="btn app-close" * ngIf="rowData && rowData.isRecommeneded == 1"(click) = "onModelChange()" > Recommeneded < /div>
//         < div class="btn app-closedd" * ngIf="rowData && rowData.isRecommeneded != 1"(click) = "onModelChange()" style = "cursor: not-allowed;" > Un Recommeneded < /div>
//             < /span>
//             < span class="start-rate" * ngIf="rowData.rcatname" >
//                 <div class="btn app-close" * ngIf="rowData && rowData.feature != 1"(click) = "onModelChange()" > Featured < /div>
//                     < div class="btn app-closedd" * ngIf="rowData && rowData.feature == 1"(click) = "onModelChange()" style = "cursor: not-allowed;" > Un Featured < /div>
//                         < /span>
