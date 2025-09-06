import { ChangeDetectorRef, Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { log } from 'console';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { PrivilagesData } from 'src/app/menu/privilages';

@Component({
  selector: 'app-shipping',
  templateUrl: './shipping.component.html',
  styleUrls: ['./shipping.component.scss']
})
export class ShippingComponent {
  curreny_symbol: any;
  type_of: string = 'Your Type';
  profPrice = [
    { min: '', max: '', amount: '' },
  ];
  price_list: any[] = [];
  shipping_id : any
  kilos : any
  curentUser: any;
  constAmount : any
  userPrivilegeDetails: PrivilagesData[];
  viewOnly:boolean=false;
  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthenticationService,
  ) {
    // this.cdr.detectChanges();
    console.log("22222222222222222");
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/settings/shipping' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'settings');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        if (this.userPrivilegeDetails[0].status.view && !this.userPrivilegeDetails[0].status.edit) {
          this.viewOnly = true;
        } else {
          this.viewOnly = false;
        }

      }
    }
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
      this.curreny_symbol = result?.currency_symbol ?? "₹";
    });

    this.apiService.CommonApi(Apiconfig.getshippingManagement.method, Apiconfig.getshippingManagement.url, {}).subscribe(result => {
      if(result && result.data && result.data.docdata && result.data.docdata.status == true){
      this.profPrice = result.data.docdata.doc.price
       this.shipping_id = result.data.docdata.doc._id
       this.kilos = result.data.docdata.doc.kilogram
       this.constAmount = result.data.docdata.doc.constAmount
     }
      
     
     });
  }

  ngOnInit(): void {
    // getshippingManagement
  

  }


  addRow() {
    this.profPrice.push({ min: '', max: '', amount: '' });
  }

  deleteRow(index: number) {
    if (this.profPrice.length > 1) {
      this.profPrice.splice(index, 1);
    }
  }
  validateNumberInput(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow only numbers (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }
  validateMinMax(index: number) {
    const item = this.profPrice[index];


  //   const minAmount = Number(item.min);
  // const maxAmount = Number(item.max);
    if (item.min !== '' && item.max !== '' && Number(item.min) > Number(item.max)) {
      this.notifyService.showError("Minimum amount should be less than the maximum amount.");
      item.max = '';
    }
  }

  onSubmitForm(form: NgForm) {
    if (form.valid) {
      this.price_list = this.profPrice.map(item => ({
        min: item.min,
        max: item.max,
        amount: item.amount
      }));
var data = {} as any
data.price_list = this.price_list
data.kilos = this.kilos
data.constAmount = this.constAmount
if(this.shipping_id && this.shipping_id != undefined){
  data._id = this.shipping_id
}

      this.apiService.CommonApi(Apiconfig.shippingManagement.method, Apiconfig.shippingManagement.url, data).subscribe(
        (result) => {
          if (result.status) {
            if(this.shipping_id){
              this.notifyService.showSuccess("Updated successfully!");
            }else{
              this.notifyService.showSuccess("Added successfully!");
            }
            this.router.navigate(['/'])
          }
        }
      );
    } else {
      this.notifyService.showError("Please fill all required fields.");
    }
  }

  isNumberKey(event: any) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }
}
