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
  selector: 'app-billing-address',
  templateUrl: './billing-address.component.html',
  styleUrls: ['./billing-address.component.scss']
})
export class BillingAddressComponent implements OnInit {
  userId : any
  billingAddress: any
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
      console.log(this.userId,"this.userIdthis.userIdthis.userId");
      
    }
    submitted : Boolean = false
  ngOnInit(): void {

    // getBillingAddress
    if(this.userId){
      this.apiService.CommonApi(Apiconfig.getBillingAddress.method, Apiconfig.getBillingAddress.url, {id : this.userId}).subscribe(res => {
        console.log("ressssssssssssssssssssssssssssssssssss",res);
        if (typeof (res && res.data && res.data.status) != 'undefined' && (res && res.data && res.data.status) == '1') {
              this.billingAddress = res.data;
               this.form.controls['first_name'].setValue(this.billingAddress.first_name)
               this.form.controls['last_name'].setValue(this.billingAddress.last_name)
               this.form.controls['country'].setValue(this.billingAddress.country)
               this.form.controls['address'].setValue(this.billingAddress.line1)
               this.form.controls['city'].setValue(this.billingAddress.city)
               this.form.controls['state'].setValue(this.billingAddress.state)
               this.form.controls['pincode'].setValue(this.billingAddress.zipcode)
               this.form.controls['phone_number'].setValue(this.billingAddress.phone_number)
               this.form.controls['email'].setValue(this.billingAddress.email)
               this.form.controls['choose_location'].setValue(this.billingAddress.choose_location)

               

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
  validateNumberInput(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow only numeric keys (0-9)
    if (charCode < 48 || charCode > 57) {
        event.preventDefault();
    }
}

  limitInputLength(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 15) {
      input.value = input.value.slice(0, 15);
    }
  }

  onFormSubmit(billingForm :  any){
    console.log("1111111111111");
    
    this.submitted  = true
if(billingForm.valid){
 let data = {} as any
 if(this.billingAddress && this.billingAddress != ('' || undefined || null) && this.billingAddress._id){
  data._id = this.billingAddress._id
 }
 data.first_name = billingForm.value.first_name;
 data.last_name = billingForm.value.last_name;
 data.country = billingForm.value.country;
 data.line1 =  billingForm.value.address;
 data.city = billingForm.value.city;
 data.state = billingForm.value.state;
 data.pincode = billingForm.value.pincode;
 data.phone_number = billingForm.value.phone_number;
 data.email = billingForm.value.email;
 data.choose_location = billingForm.value.choose_location;

 if(this.userId){
   data.user_id = this.userId
 }


this.apiService.CommonApi(Apiconfig.saveBillingAddress.method, Apiconfig.saveBillingAddress.url, data).subscribe(res => {
  if (typeof res.status != 'undefined' && res.status == '1') {
    if(this.billingAddress && this.billingAddress != ('' || undefined || null) && this.billingAddress._id){

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
