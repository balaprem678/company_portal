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
      class="badge badge-primary badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 1"
      (click)="confirmModal.show()"
      >Order Packed</span
    >
    <span
      style="cursor: pointer;"
      title="Order cancel"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 19 || rowData.status == 10">Order Cancelled by Admin</span>
    <span
      style="cursor: pointer;"
      title="Update as Ongoing Order"
      class="badge badge-warning badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 3"
      (click)="confirmModal.show()"
      >On Going Order</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 6"
      (click)="confirmModal.show()"
      >Delivered</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 7"
      >Order Delivered</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 8"
      >Order Delivered</span
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
      title="Update as Order Collected"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.foods.status == 16"
      (click)="confirmModal.show()"
      >Order Collected</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order refunded"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.foods.status == 17"
      (click)="confirmModal.show()"
      >Order refunded</span
    >
    <span
      style="cursor: pointer;"
      title="Update as Order refunded"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 9"
      (click)="confirmModal.show()"
      >Order Cancelled</span
    >
    <span
      style="cursor: pointer;"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.foods.status == 18"
      >{{ rowData.foods.refundStatus }}</span
    >
    <!-- <span style="cursor: pointer;" title="Update as Order Delivered" class='badge badge-success badge-pill py-2 px-2' *ngIf="rowData && rowData.status == 16" (click)="confirmModal.show()" >Order Collected</span> -->

    <!--title="Update as Order refunded" -->
    <div
      bsModal
      #confirmModal="bs-modal"
      class="modal fade order_status_modal"
      id="exampleModalCenter"
      tabindex="-1"
      role="dialog"
      aria-labelledby="exampleModalCenterTitle"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content cases-model">
          <h5>Order Id: {{ rowData ? rowData.order_id : '' }}</h5>

          <h6 *ngIf="rowData && rowData.status == 1">
            Are you sure! Do you want to accept the order?
          </h6>
  <div *ngIf="rowData && rowData.status == 1">
  <label for="height">Enter Length of the Pack (cm):</label>
  <input
    type="number"
    id="length" [(ngModel)]="length" class="form-control" required placeholder="Enter length in cm" min="0"
  (input)="validateLength($event)" />
  <span *ngIf="lengthError" class="text-danger"
    >Length is required and must be greater than zero</span>

    <label for="height">Enter Breadth of the Pack (cm):</label>
  <input
    type="number"
    id="breadth" [(ngModel)]="breadth" class="form-control" required placeholder="Enter breadth in cm" min="0"
  (input)="validateBreadth($event)"/>
  <span *ngIf="breadthError" class="text-danger"
    >Breadth is required and must be greater than zero</span>



  <label for="height">Enter Height of the Pack (cm):</label>
  <input
    type="number"
    id="height" [(ngModel)]="height" class="form-control" required placeholder="Enter height in cm" min="0"
  (input)="validateHeight($event)"/>
  <span *ngIf="heightError" class="text-danger"
    >Height is required and must be greater than zero</span>


  

  

</div>
          <h6 *ngIf="rowData && rowData.status == 3">
            <!-- Are you sure! Do you want to ship this order? -->
             The has been packed and send to the  courier partner 
          </h6>
          <h6 *ngIf="rowData && rowData.status == 6">
            Are you sure? Confirm that this order has been delivered?
          </h6>
          <h6 *ngIf="rowData && rowData.foods.status == 16">
            Are you sure? Do you collected this order?
          </h6>
          <h6 *ngIf="rowData && rowData.foods.status == 17">
            Are you sure? Do you refund this order
          </h6>
          <h6 *ngIf="rowData && rowData.foods.status == 17">
            Confirm that you have refunded the:
            {{
              rowData.foods.price && rowData.foods.quantity
                ? rowData.foods.price * rowData.foods.quantity
                : 0
            }}
          </h6>
          <h6 *ngIf="rowData && rowData.status == 9">
            Are you sure! Do you want to refund this order?
          </h6>
        

          <div class="yes_no mt-5 " *ngIf="rowData && rowData.status != 3">
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
  styleUrls: ['./ordermanagement.component.scss'],
})
export class OrderManageComponent implements OnInit {

  height: number | null = null;
  heightError: boolean = false;
  length: number | null = null;
  lengthError: boolean = false;
  breadth: number | null = null;
  breadthError: boolean = false;


  ngOnInit(): void {
    console.log(
      this.rowData,
      'rowData----------------------------------------------'
    );
  }
  rowData: any;
  confirmModal: any;
  @Input() value: any;
  @ViewChild('confirmModal') model: BsModalRef;

  @Output() save: EventEmitter<any> = new EventEmitter();
  onModelChange() {
    // Reset error flags
    this.heightError = false;
    this.lengthError = false;
    this.breadthError = false;

    // Validate height
    if (!this.height || this.height <= 0) {
      this.heightError = true; // Show error if height is invalid
    }

    // Validate length
    if (!this.length || this.length <= 0) {
      this.lengthError = true; // Show error if length is invalid
    }

    // Validate breadth
    if (!this.breadth || this.breadth <= 0) {
      this.breadthError = true; // Show error if breadth is invalid
    }

    // If all dimensions are valid, emit the data
    if (!this.heightError && !this.lengthError && !this.breadthError) {
      console.log('rowData-----------------------', this.rowData);
      this.save.emit({
        ...this.rowData,
        height: this.height,
        length: this.length,
        breadth: this.breadth
      }); // Emit with all dimensions
      this.model.hide();
    }
  }

  validateHeight(event: Event) {
    const input = (event.target as HTMLInputElement);
    if (input.value && +input.value < 0) {
      input.value = '0';
      this.height = 0;  // Ensure the model also updates to 0
    }
  }

  validateLength(event: Event) {
    const input = (event.target as HTMLInputElement);
    if (input.value && +input.value < 0) {
      input.value = '0';
      this.length = 0;  // Ensures the model stays consistent
    }
  }

  validateBreadth(event: Event) {
    const input = (event.target as HTMLInputElement);
    if (input.value && +input.value < 0) {
      input.value = '0';
      this.breadth = 0;  // Ensures model consistency
    }
  }
}
