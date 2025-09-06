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
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss']
})
export class ContactUsComponent implements OnInit {
submitted : Boolean = false
settings : any
@ViewChild('addressForm') addressForm: NgForm; 
 constructor( private apiService: ApiService,
    private socketService: WebsocketService,
    public store: DefaultStoreService,
    private modalService: BsModalService,
    private notifyService: NotificationService, private route: Router,
    private activatedRoute: ActivatedRoute,) { 
      this.store.generalSettings.subscribe(result => {
        this.settings = result;
        
      })
    }

  ngOnInit(): void {
  }

  onFormSubmit(shippingForm :  any){
    this.submitted  =  true;
    if(shippingForm.valid){

    var object = {
      name : shippingForm.value.name,
      email : shippingForm.value.email,
      message : shippingForm.value.message
    }
    // contactUS
    console.log(object,"objectttttttttttttttttttt");
    this.apiService.CommonApi(Apiconfig.contactUS.method, Apiconfig.contactUS.url, object).subscribe(result => {
      if (result && result.status ===1) {

          this.notifyService.showSuccess("Your message has been submitted");
          // this.addressForm.value.name = ''
          // this.addressForm.value.email = ''
          // this.addressForm.value.message = ''
          // this.addressForm.reset(); 
          this.submitted=false
          shippingForm.controls.name.setValue('');
        shippingForm.controls.email.setValue('');
        shippingForm.controls.message.setValue('');
      }else{
          this.notifyService.showError(result.message);
      } 
    })


    }

  }

}
