import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import privilagedata, { PrivilagesData } from 'src/app/menu/privilages';
import { AuthenticationService } from 'src/app/_services/authentication.service';

@Component({
  selector: 'app-sub-admin-addedit',
  templateUrl: './sub-admin-addedit.component.html',
  styleUrls: ['./sub-admin-addedit.component.scss']
})
export class SubAdminAddeditComponent implements OnInit {

  @ViewChild('adminForm') form: NgForm;

  adminDetails: any;
  pageTitle: string = 'Sub Admin Add';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  isChecked: boolean = false;
  privilagesdata: PrivilagesData[] = privilagedata;
  userPrivilegeDetails: PrivilagesData[] = [];
  curentUser: any;
  checkpassword: boolean = false;
  usernames : any;
  names : any;
  emails : any
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
      this.pageTitle = "Sub Admin " + (this.viewpage ? 'View' : 'Edit');
      this.apiService.CommonApi(Apiconfig.subadminEdit.method, Apiconfig.subadminEdit.url, { data: id }).subscribe(
        (result) => {
          if (result) {
            this.adminDetails = result;
            console.log(this.adminDetails,"this.adminDetailsthis.adminDetails");
            this.usernames = this.adminDetails.username ? this.adminDetails.username : ''
            this.names = this.adminDetails.name ? this.adminDetails.name : ''
            this.emails = this.adminDetails.email ? this.adminDetails.email : ''
            // this.form.controls['username'].setValue(this.adminDetails.username ? this.adminDetails.username : '');
            // this.form.controls['name'].setValue(this.adminDetails.name ? this.adminDetails.name : '');
            // this.form.controls['email'].setValue(this.adminDetails.email ? this.adminDetails.email : '');

            this.privilagesdata.forEach((value) => {
              let index = this.adminDetails.privileges.findIndex(x => x.alias === value.alias);
              if (index != -1) {
                value.status = this.adminDetails.privileges[index].status;
              }
            })
            this.checkprivilages();
            if (this.viewpage) {
              this.form.form.disable();
            }
          }
        }
      )
    }
  };

  selectall(event) {
    this.privilagesdata.forEach((value) => {
      // Only set event for properties that exist (edit, view, delete)
      if (value.status.edit !== undefined) {
        value.status.edit = event;
      }
      if (value.status.view !== undefined) {
        value.status.view = event;
      }
      if (value.status.delete !== undefined) {
        value.status.delete = event;
      }
      
      // If add exists, set event for it as well (optional)
      if (value.status.add !== undefined) {
        value.status.add = event;
      }
      if (value.status.export !== undefined) {
        value.status.export = event;
      }
      if (value.status.bulk !== undefined) {
        value.status.bulk = event;
      }
    });
  }

  checkprivilages() {
    var i = 0;
    // console.log(this.privilagesdata);

    this.privilagesdata.forEach((value) => {
      if (value.status.add == true && value.status.edit == true && value.status.view == true && value.status.delete == true) {
        i++;
      }
    });
    if (this.privilagesdata.length === i) {
      this.isChecked = true;
    } else {
      this.isChecked = false;
    }
  }

  public onFormSubmit(adminForm: UntypedFormGroup) {
    if (adminForm.valid) {
      this.submitebtn = true;
      var data = adminForm.value;
      console.log("data", data)
      data.role = 'subadmin';
      data._id = this.ActivatedRoute.snapshot.paramMap.get('id');
      data['privileges'] = this.privilagesdata;
      this.apiService.CommonApi(Apiconfig.subadminSave.method, Apiconfig.subadminSave.url, data).subscribe(
        (result) => {
          if (result) {
            this.router.navigate(['/app/administrator/sub-admin-list']);
            if (data._id) {
              this.notifyService.showSuccess("Successfully updated.");
            } else {
              this.notifyService.showSuccess("Successfully Added.");
            }
          } else {
            this.notifyService.showError("Sorry, Please try again later.");
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
