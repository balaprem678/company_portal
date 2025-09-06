import { Component, ElementRef, NgZone, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-shipping-address',
  templateUrl: './shipping-address.component.html',
  styleUrls: ['./shipping-address.component.scss']
})
export class ShippingAddressComponent implements OnInit {
  userId : any
  shippingAddress : any
  addressId:any
  @ViewChild('addressForm') form: NgForm;
  constructor(    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService, private route: Router,
    private activatedRoute: ActivatedRoute,) { 
      var useStrg = localStorage.getItem('userId');
      if (useStrg) {
        this.userId = useStrg;
      };
    }
    submitted : Boolean = false
  ngOnInit(): void {
    // getShippingAddress
    this.activatedRoute.params.subscribe(params => {
      this.addressId = params['id'];
    });
    if(this.userId){
      let data ={
        user_id:this.userId,
        address_id:this.addressId,
      }
      this.apiService.CommonApi(Apiconfig.editShippingAddress.method, Apiconfig.editShippingAddress.url,data).subscribe(res => {
        console.log("ressssssssssssssssssssssssssssssssssss",res);
        if (typeof (res && res.data ) != 'undefined') {
              this.shippingAddress = res.data;
               this.form.controls['first_name'].setValue(this.shippingAddress.first_name)
               this.form.controls['last_name'].setValue(this.shippingAddress.last_name)
               this.form.controls['country'].setValue(this.shippingAddress.country)
               this.form.controls['address'].setValue(this.shippingAddress.line1)
               this.form.controls['city'].setValue(this.shippingAddress.city)
               this.form.controls['state'].setValue(this.shippingAddress.state)
               this.form.controls['pincode'].setValue(this.shippingAddress.zipcode)
               this.form.controls['phone_number'].setValue(this.shippingAddress.phone.number)
               this.form.controls['email'].setValue(this.shippingAddress.email)
               this.form.controls['choose_location'].setValue(this.shippingAddress && (this.shippingAddress.choose_location != (undefined || null || '')) &&  this.shippingAddress.choose_location ? this.shippingAddress.choose_location: "home")
               

        }
        // else {
        //   if (typeof res.errors != 'undefined') {
        //     this.notifyService.showError(res.errors);
        //   }
      
        // }
      })
    }else{
      this.form.controls['first_name'].setValue('')
      this.form.controls['last_name'].setValue('')
      this.form.controls['country'].setValue('')
      this.form.controls['address'].setValue('')
      this.form.controls['city'].setValue('')
      this.form.controls['state'].setValue('')
      this.form.controls['pincode'].setValue('')
      this.form.controls['phone_number'].setValue('')
      this.form.controls['email'].setValue('')
      this.form.controls['choose_location'].setValue('')
      
    }
  }

  limitInputLength(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 15) {
      input.value = input.value.slice(0, 15);
    }
  }
  validateNumberInput(event: KeyboardEvent): void {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.keyCode || event.which);
    if (!pattern.test(inputChar)) {
        event.preventDefault();
    }
}
  onFormSubmit(shippingForm :  any){
    console.log("1111111111111");
    
    this.submitted  = true
if(shippingForm.valid){
 let data = {} as any
 data.first_name = shippingForm.value.first_name;
 data.last_name = shippingForm.value.last_name;
 data.country = shippingForm.value.country;
 data.line1 =  shippingForm.value.address;
 data.city = shippingForm.value.city;
 data.state = shippingForm.value.state;
 data.pincode = shippingForm.value.pincode;
 data.phone_number = shippingForm.value.phone_number;
 data.email = shippingForm.value.email;
 data.choose_location = shippingForm.value.choose_location;
 if(this.userId){
   data.user_id = this.userId
 }
 if(this.shippingAddress && this.shippingAddress != ('' || undefined || null) && this.addressId){
  data._id = this.addressId
 }


this.apiService.CommonApi(Apiconfig.saveNewAddres.method, Apiconfig.saveNewAddres.url, data).subscribe(res => {
  if (typeof res.status != 'undefined' && res.status == '1') {
    if(this.shippingAddress && this.shippingAddress != ('' || undefined || null) && this.shippingAddress._id){
      this.notifyService.showSuccess("Updated Successfully");
    }else{
      this.notifyService.showSuccess("Added Successfully");
    }
    // this.ngOnInit();
    ///my-account-page/manage-address
    this.route.navigate(['my-account-page/manage-address'])
  }
  else {
    if (typeof res.errors != 'undefined') {
      this.notifyService.showError(res.errors);
    }

  }
})



} else {
  this.notifyService.showError('Please fill all the mandatory fields');
}

  }

}
