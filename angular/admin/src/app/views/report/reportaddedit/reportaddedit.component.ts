import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-reportaddedit',
  templateUrl: './reportaddedit.component.html',
  styleUrls: ['./reportaddedit.component.scss']
})
export class ReportaddeditComponent implements OnInit {
  @ViewChild('reporttempleteForm') form: NgForm;
  reportTempleteDetails: any;
  pageTitle: string = 'Add Report Templete';
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
      if (this.router.url == '/app/report/report-add' || (split.length > 0 && split[2] == 'report')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'report');
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
      this.pageTitle = (this.viewpage ? 'View' : 'Edit') + " Report Templete";
      this.apiService.CommonApi(Apiconfig.reportTempletEdit.method, Apiconfig.reportTempletEdit.url + id, {}).subscribe(
        (result) => {
          if (result && result.status) {
            this.reportTempleteDetails = result.data;
            this.form.controls['name'].setValue(this.reportTempleteDetails.name ? this.reportTempleteDetails.name : '');
            this.form.controls['contant'].setValue(this.reportTempleteDetails.contant ? this.reportTempleteDetails.contant : '');
            this.form.controls['status'].setValue(this.reportTempleteDetails.status ? this.reportTempleteDetails.status : '');
            if (this.viewpage) {
              this.form.form.disable();
            }
          }
        }
      )
    }
  };

  public onFormSubmit(reporttempleteForm: UntypedFormGroup) {
    if (reporttempleteForm.valid) {
      this.submitebtn = true;
      var data = reporttempleteForm.value;
      data.id = this.ActivatedRoute.snapshot.paramMap.get('id');
      this.apiService.CommonApi(Apiconfig.reportTempletSave.method, Apiconfig.reportTempletSave.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/app/report/report-list']);
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
