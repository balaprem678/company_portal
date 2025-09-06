import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'order-manage-component',
  template: `
    <span
      style="cursor: pointer;"
      title="View Product details"
      class="badge badge-primary badge-pill py-2 px-2"
      (click)="confirmModal.show()"
      >View Details</span
    >

    <div
      bsModal
      #confirmModal="bs-modal"
      class="modal fade user_total_order"
      id="exampleModalCenter"
      tabindex="-1"
      role="dialog"
      aria-labelledby="exampleModalCenterTitle"
      aria-hidden="true"
    >
      <div
        class="modal-dialog modal-dialog-centered"
        role="document"
        style="max-width: 1000px; "
      >
        <div class="modal-content cases-model">
          <div class="modal-header order_invoice">
            Order Id: {{ rowData ? rowData.order_id : '' }}
            <button type="button" class="close" aria-label="Close" (click)="confirmModal.hide()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="order_details p-0">
              <table>
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Sku</th>
                    <th>Item Price</th>
                    <th>Quantity</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let foodlist of foods">
                    <td>
                      <div class="product_details">
                        <img
                          style="height : 100px;width : 100px"
                          *ngIf="foodlist.image"
                          src="{{ apiUrl }}{{ foodlist.image }}"
                          alt=""
                        />
                        <div class="product_name_size">
                          <h3 class="product_name">{{ foodlist.name }}</h3>
                          <p class="size">
                            variant : {{ foodlist.variations[0][0].chaild_name }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{{foodlist.sku}}</td>
                    <td>{{ foodlist.price }}</td>
                    <td>{{ foodlist.quantity }}</td>
                    <td>{{ foodlist.price * foodlist.quantity }}</td>
                  </tr>
                  <tr class="total_amt_footer">
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>Total Amount &nbsp;:</td>
                    <td>{{calculateTotalAmount()}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class viewdetailsComponent implements OnInit {
  foods: any[] = [];
  apiUrl: any = environment.apiUrl;

  constructor(private apiService: ApiService) { }
  ngOnInit(): void {
    // this.onModelChange()
    console.log(this.rowData, 'rowData11111111111111111111111');
    this.apiService
      .CommonApi(Apiconfig.getorders.method, Apiconfig.getorders.url, {
        id: this.rowData._id,
      })
      .subscribe((result) => {
        console.log(
          result,
          'suryaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        this.foods = result[0].foods;
      });
  }
  calculateTotalAmount() {
    return this.foods.reduce((acc, foodlist) => acc + (foodlist.price * foodlist.quantity), 0);
  }
  rowData: any;
  confirmModal: any;
  @Input() value: any;
  @ViewChild('confirmModal') model: BsModalRef;

  @Output() save: EventEmitter<any> = new EventEmitter();
  onModelChange() {
    this.save.emit(this.rowData);
    console.log('rowData', this.rowData);
    this.model.hide();
  }
}
