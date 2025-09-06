import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-ratting-ques-addedit',
  templateUrl: './ratting-ques-addedit.component.html',
  styleUrls: ['./ratting-ques-addedit.component.scss']
})
export class RattingQuesAddeditComponent implements OnInit {

  @ViewChild('rattingQusForm') form: NgForm;
  rattingQusDetails: any;
  pageTitle: string = 'Add Rating Questions';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];

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
      if (this.router.url == '/app/ratting/add' || (split.length > 0 && split[2] == 'ratting')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'ratting');
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
      this.pageTitle = (this.viewpage ? 'View' : 'Edit') + " Ratting Questions";
      this.apiService.CommonApi(Apiconfig.rattingEdit.method, Apiconfig.rattingEdit.url + id, {}).subscribe(
        (result) => {
          if (result && result.status) {
            this.rattingQusDetails = result.data;
            this.form.controls['title'].setValue(this.rattingQusDetails.title ? this.rattingQusDetails.title : '');
            this.form.controls['type'].setValue(this.rattingQusDetails.type ? this.rattingQusDetails.type : '');
            this.form.controls['status'].setValue(this.rattingQusDetails.status ? this.rattingQusDetails.status : 0);
            if (this.viewpage) {
              this.form.form.disable();
            }
          }
        }
      )
    }
  };

  public onFormSubmit(rattingQusForm: UntypedFormGroup) {
    if (rattingQusForm.valid) {
      this.submitebtn = true;
      var data = {
        title: rattingQusForm.value.title ? rattingQusForm.value.title : '',
        type: rattingQusForm.value.type ? rattingQusForm.value.type.toLowerCase() : '',
        status: rattingQusForm.value.status ? rattingQusForm.value.status : 0,
      } as any;
      data.id = this.ActivatedRoute.snapshot.paramMap.get('id');
      this.apiService.CommonApi(Apiconfig.rattingSave.method, Apiconfig.rattingSave.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/app/ratting/list']);
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