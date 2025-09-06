import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
@Component({
  selector: 'order-manage-component',
  template: `
    <span
      style="cursor: pointer;"
      title="Update as Order Packed"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 1"
      (click)="confirmModal.show()"
      >Cancel Order</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Ongoing Order"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 3"
      (click)="confirmModal.show()"
      >Cancel Order</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 6"
      (click)="confirmModal.show()"
      >Cancel Order</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order Collected"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 16"
      (click)="confirmModal.show()"
      >Order Collected</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order refunded"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 17"
      (click)="confirmModal.show()"
      >Order refunded</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order refunded"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 9"
      (click)="confirmModal.show()"
      >Order canceled</span>
    <span
      style="cursor: pointer;"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 18"
      >{{ rowData.refundStatus }}</span
    >
    <!-- <span style="cursor: pointer;" title="Update as Order Delivered" class='badge badge-success badge-pill py-2 px-2' *ngIf="rowData && rowData.status == 16" (click)="confirmModal.show()" >Order Collected</span> -->

    <!--title="Update as Order refunded" -->
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
      <div class="modal-dialog modal-dialog-centered cancel_order_modal" role="document">
        <div class="modal-content cases-model">
            <h5> Order Id: {{ rowData ? rowData.order_id : '' }}</h5>
            <h6
              *ngIf="
                (rowData && rowData.status == 1) ||
                rowData.status == 3 ||
                rowData.status == 6
              "
            >
              Are you sure! Do you want to Cancel The Order
            </h6>
           

          <div class="yes_no">
            <button
              type="button"
              class="btn "
              (click)="confirmModal.hide()"
            >
              No
            </button>
              <button
              type="button"
              class="btn "
              (click)="onModelChange()"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrderCancelComponent {
  rowData: any;
  confirmModal: any;
  @Input() value: any;
  @ViewChild('confirmModal') model: BsModalRef;

  @Output() save: EventEmitter<any> = new EventEmitter();
  onModelChange() {
    this.save.emit(this.rowData);
    this.model.hide();
  }
}
