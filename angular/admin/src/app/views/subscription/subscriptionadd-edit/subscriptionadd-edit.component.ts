import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-subscriptionadd-edit',
  templateUrl: './subscriptionadd-edit.component.html',
  styleUrls: ['./subscriptionadd-edit.component.scss']
})
export class SubscriptionaddEditComponent implements OnInit {

  @ViewChild('subscriptionForm') form: NgForm;
  subscriptionDetails: any;
  pageTitle: string = 'Add Subscription';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  validityList: any[] = [];
  mainDaysList: any[] = [];
  daysList: any[] = [];
  curentUser:any;
  userPrivilegeDetails:PrivilagesData[]=[];

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/subscription/add' || (split.length > 0 && split[2] == 'subscription')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'subscription');
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
    this.validityList = [
      {
        name: 'Day',
        value: 'day'
      },
      {
        name: 'Month',
        value: 'month'
      },
      {
        name: 'Year',
        value: 'year'
      },
      // {
      //   name: 'Life Time Access',
      //   value: 'full year'
      // },
    ];
    this.mainDaysList = [
      {
        name: '1 Day',
        value: '1',
        validity: 'day'
      },
      {
        name: '30 Days',
        value: '30',
        validity: 'day'
      },
      {
        name: '3 Months',
        value: '90',
        validity: 'month'
      },
      {
        name: '6 Months',
        value: '180',
        validity: 'month'
      },
      {
        name: '1 Year',
        value: '365',
        validity: 'year'
      },
      // {
      //   name: 'Life Time Access',
      //   value: 'full year',
      //   validity: 'full year'
      // },
    ]
  }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.pageTitle = (this.viewpage ? 'View' : 'Edit') + " Subscription";
      this.apiService.CommonApi(Apiconfig.subscriptionEdit.method, Apiconfig.subscriptionEdit.url + id, {}).subscribe(
        (result) => {
          if (result && result.status) {
            this.subscriptionDetails = result.data;            
            this.validityChange(this.subscriptionDetails.validity ? this.subscriptionDetails.validity : '');
            this.form.controls['plan_name'].setValue(this.subscriptionDetails.plan_name ? this.subscriptionDetails.plan_name : '');
            this.form.controls['description'].setValue(this.subscriptionDetails.description ? this.subscriptionDetails.description : '');
            this.form.controls['price'].setValue(this.subscriptionDetails.price ? this.subscriptionDetails.price : '');
            this.form.controls['status'].setValue(this.subscriptionDetails.status ? this.subscriptionDetails.status : '');
            // this.form.controls['validity'].setValue(this.subscriptionDetails.validity ? this.subscriptionDetails.validity : '');
            this.form.controls['days'].setValue(this.subscriptionDetails.days ? this.subscriptionDetails.days : '');
            if (this.viewpage) {
              this.form.form.disable();
            }
          }
        }
      )
    }
  };

  validityChange(val) {
    this.daysList = this.mainDaysList.filter(x => x.validity == val);
  }

  public onFormSubmit(subscriptionForm: UntypedFormGroup) {
    if (subscriptionForm.valid) {
      this.submitebtn = true;
      var data = subscriptionForm.value;
      data.id = this.ActivatedRoute.snapshot.paramMap.get('id');
      this.apiService.CommonApi(Apiconfig.subscriptionSave.method, Apiconfig.subscriptionSave.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/app/subscription/list']);
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
          this.submitebtn = false;
        }, (error) => {
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

}