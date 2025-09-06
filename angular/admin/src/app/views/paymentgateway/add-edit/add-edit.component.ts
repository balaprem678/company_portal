import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-add-edit',
  templateUrl: './add-edit.component.html',
  styleUrls: ['./add-edit.component.scss']
})
export class AddEditComponent implements OnInit {

  @ViewChild('paymentgatewayForm') form: NgForm;
  paymentDetails: any;
  pageTitle: string = 'Add Payment Gateway';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  gateway_name: any;
  formData: any = {}; // Initialize formData object
  image_select: any;
  image_preview: any;
  // submitebtn: boolean = false; // You may need to initialize this based on your logic
  env:any = environment.apiUrl;
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/paymentgateway/add' || (split.length > 0 && split[2] == 'paymentgateway')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'paymentgateway');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };
    if (split && split.length > 3) {
      if ('view' == split[3]) {
        this.viewpage = true;
      }
    };
  }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.pageTitle = (this.viewpage ? 'View' : 'Edit') + " Payment Gateway";
      this.apiService.CommonApi(Apiconfig.paymentgatewayEdit.method, Apiconfig.paymentgatewayEdit.url, { id: id }).subscribe(
        (result) => {
          this.paymentDetails = result[0];
          this.gateway_name = this.paymentDetails.gateway_name;
          this.image_preview = this.paymentDetails.settings.logo ? this.env+this.paymentDetails.settings.logo : null; 
        }
      )
    }
  };

  addPaymentGateway() {

  }

  public onFormSubmit(paymentgatewayForm: UntypedFormGroup) {
    this.submitebtn = true;
    this.paymentDetails._id = this.ActivatedRoute.snapshot.paramMap.get('id');
    let form_data = new FormData();
    form_data.append("paymentDetails",JSON.stringify(this.paymentDetails));
    if(this.image_select){
      form_data.append("logo",this.image_select);
    }
    this.apiService.CommonApi(Apiconfig.paymentgatewaySave.method, Apiconfig.paymentgatewaySave.url, form_data).subscribe(
      (result) => {

        this.router.navigate(['/app/paymentgateway/list']);
        this.notifyService.showSuccess("Payment gateway updated successfully.");
        this.submitebtn = false;
      }, (error) => {
        this.submitebtn = false;
        this.notifyService.showError("Something went wrong.");
      }
    )
  }

  logo_change(file) {
    if (file) {
      this.image_select = file[0];
      var reader = new FileReader();
      reader.onload = () => {
        console.log(reader.result)
        this.image_preview = reader.result
      };
      reader.readAsDataURL(file[0]);
    }
  }
}