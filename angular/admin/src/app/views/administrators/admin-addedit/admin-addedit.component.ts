import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-admin-addedit',
  templateUrl: './admin-addedit.component.html',
  styleUrls: ['./admin-addedit.component.scss']
})
export class AdminAddeditComponent implements OnInit {

  @ViewChild('adminForm') form: NgForm;

  adminDetails: any;
  pageTitle: string = 'Admin Add';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  checkpassword: boolean = false;

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/administrator/list' || (split.length > 0 && split[2] == 'administrator')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'administrator');
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
      this.checkpassword = true
      this.pageTitle = "Admin " + (this.viewpage ? 'View' : 'Edit');
      this.apiService.CommonApi(Apiconfig.adminEdit.method, Apiconfig.adminEdit.url, { id: id }).subscribe(
        (result) => {
          if (result && result.length > 0) {
            this.adminDetails = result[0];
            this.form.controls['username'].setValue(this.adminDetails.username ? this.adminDetails.username : '');
            this.form.controls['name'].setValue(this.adminDetails.name ? this.adminDetails.name : '');
            this.form.controls['email'].setValue(this.adminDetails.email ? this.adminDetails.email : '');
            if (this.viewpage) {
              this.form.form.disable();
            }
          }
        }
      )
    }
  };

  public onFormSubmit(adminForm: UntypedFormGroup) {
    if (adminForm.valid) {
      this.submitebtn = true;
      var data = adminForm.value;
      data.role = 'admin';
      data._id = this.ActivatedRoute.snapshot.paramMap.get('id');
      this.apiService.CommonApi(Apiconfig.adminSave.method, Apiconfig.adminSave.url, data).subscribe(
        (result) => {
          if (result && result.modifiedCount == 1) {
            this.router.navigate(['/app/administrator/list']);
            this.notifyService.showSuccess("Successfully Updated");
          } else {
            this.notifyService.showError("Sorry something went wrong. Please try again later");
          }
        }, (error) => {
          this.submitebtn = false;
        }
      )
    }
    else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

}
