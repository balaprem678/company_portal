import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-add-edit-document',
  templateUrl: './add-edit-document.component.html',
  styleUrls: ['./add-edit-document.component.scss']
})
export class AddEditDocumentComponent implements OnInit {
  id: any;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  viewpage: boolean = false;
  editDetails: any;
  has_expire: any;
  has_require: any;
  @ViewChild('docFieldForm') form: UntypedFormGroup;
  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
    private ActivatedRoute: ActivatedRoute,

  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    console.log("current", this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/documentManagement/add' || (split.length > 0 && split[2] == 'Document Management')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Document Management');
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
  hasRequire(value) {
    this.has_require = value
  }

  hasExpire(value) {
    this.has_expire = value
  }

  ngOnInit(): void {
    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.document_edit.method, Apiconfig.document_edit.url, { id: this.id }).subscribe(
        (result) => {
          this.editDetails = result
          if (!this.viewpage) {
            this.form.controls['doc_for'].setValue(result.doc_for)
            this.form.controls['doc_name'].setValue(result.doc_name)
            // this.form.controls['has_require'].setValue(result.has_require)
            // this.form.controls['has_expire'].setValue(result.has_expire)
            this.form.controls['status'].setValue(result.status)
            this.has_expire = result.has_expire;
            this.has_require = result.has_require;
          }

        }, (error) => {

        })
    }
  }

  onSubmit(docFieldForm: UntypedFormGroup) {
    if (docFieldForm.status != "INVALID" && (this.has_expire == 1 || this.has_expire == 0) && (this.has_require == 1 || this.has_require == 0)) {
      var data = docFieldForm.value;
      data._id = this.id;
      data.has_expire = this.has_expire;
      data.has_require = this.has_require;
      this.apiService.CommonApi(Apiconfig.document_add.method, Apiconfig.document_add.url, data).subscribe(
        (result) => {
          this.router.navigate(['/app/documentManagement/list']);
          this.notifyService.showSuccess("Successfully Updated.");

        }, (error) => {
          this.notifyService.showError(error);
          window.location.reload()
        }
      )
    } else {
      this.notifyService.showError("Please fill all details.");

    }



  }

}
