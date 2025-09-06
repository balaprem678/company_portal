import { Component, ElementRef, NgZone, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-manage-address',
  templateUrl: './manage-address.component.html',
  styleUrls: ['./manage-address.component.scss']
})
export class ManageAddressComponent implements OnInit {
  userId: any;
  billingAddress: any
  BillingBoolean: boolean = false
  shippingBoolean: boolean = false
  shippingAddress: any
  selectedAddressId: string | null = null;
  constructor(private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService, private route: Router,
    private activatedRoute: ActivatedRoute,) {
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    };
  }

  ngOnInit(): void {
    if (this.userId) {
      this.apiService.CommonApi(Apiconfig.getBillingAddress.method, Apiconfig.getBillingAddress.url, { id: this.userId }).subscribe(res => {
        if (typeof (res && res.data && res.data.status) != 'undefined' && (res && res.data && res.data.status) == '1') {
          this.BillingBoolean = true
          this.billingAddress = res.data;
          console.log(this.billingAddress, "this.billingAddress");

        } else {
          this.billingAddress = {}
        }
      })

      this.apiService.CommonApi(Apiconfig.getShippingAddress.method, Apiconfig.getShippingAddress.url, { id: this.userId }).subscribe(res => {
        if (typeof (res && res.data && res.data.status) != 'undefined' && (res && res.data && res.data.status) == '1') {
          this.shippingBoolean = true
          this.shippingAddress = res.data;
          console.log(this.shippingAddress, "this.shippingAddress");
          const defaultAddress = this.shippingAddress.addressList.find(address => address.isDefault === 2);
          this.selectedAddressId = defaultAddress ? defaultAddress._id : null;
        } else {
          this.shippingAddress = res.data;
        }
      })

    }
  }




  setDefaultAddress(addressId: string) {
    let data ={
      address_id:addressId,
      user_id:this.userId
    }
    // Call your service to update the default address in the backend
    this.apiService.CommonApi( Apiconfig.setAsDefaultShippingAddress.method,Apiconfig.setAsDefaultShippingAddress.url, data).subscribe(response => {
        // Handle response
        console.log("Default address updated", response);
    });
}

deleteAddress(addressId: string) {
  let data ={
    address_id:addressId,
    user_id:this.userId
  }
  this.apiService.CommonApi( Apiconfig.deleteShippingAddress.method,Apiconfig.deleteShippingAddress.url, data).subscribe(response => {
          if (response.status === 1) {
              // Optionally, refresh the address list or remove the deleted address from the local state
              this.shippingAddress.addressList = this.shippingAddress.addressList.filter(address => address._id !== addressId);
              this.notifyService.showSuccess('Address deleted successfuly');

          } else {
              // Handle the error scenario
              this.notifyService.showError(response.message || 'Error deleting address');
          }
      }, error => {
          console.error('Error:', error);
          this.notifyService.showError('An error occurred while deleting the address.');
      });
}
}
