import { ChangeDetectorRef, Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { Apiconfig } from 'src/app/_helpers/api-config';

@Component({
  selector: 'app-cancellationaddedit',
  templateUrl: './cancellationaddedit.component.html',
  styleUrls: ['./cancellationaddedit.component.scss']
})
export class CancellationaddeditComponent implements OnInit {
  @ViewChild('userAddEditForm') form: NgForm;

  submitted: boolean = true;
  id: string;
  curentUser:any;
  userPrivilegeDetails:any;
  constructor(private route: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone,
    private authService: AuthenticationService,
    private ActivatedRoute: ActivatedRoute,) {
      this.curentUser = this.authService.currentUserValue;
      var split = this.router.url.split('/');
      console.log('888888888888')
      if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
        if (this.router.url == '/app/cancellationreason/cancellationadd' || (split.length > 0 && split[2] == 'cancellationreason')) {
          console.log(this.curentUser);
          this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Cancellation Reason');
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
     }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.cancellationedit.method, Apiconfig.cancellationedit.url, { id: this.id }).subscribe(result => {
        var editdata = result[0];
        console.log("sad", editdata)
        this.form.controls['reason'].setValue(editdata.reason ? editdata.reason : (editdata.reason ? editdata.reason : ''));
        this.form.controls['cancellation'].setValue(editdata.type ? editdata.type : (editdata.type ? editdata.type : ''));
        this.form.controls['status'].setValue(editdata.status ? editdata.status : (editdata.status ? editdata.status : ''));
      })
    }
  }

  public onFormSubmit(userAddEditForm: UntypedFormGroup) {
    if (this.id) {
      if (userAddEditForm.valid) {
        this.submitted = true;
        var data = userAddEditForm.value;
        var reason1 = {
          _id: this.id,
          status: parseInt(data.status),
          reason: data.reason,
          type: data.cancellation
        }
        console.log("asfesef", reason1)
        this.apiService.CommonApi(Apiconfig.cancellationsave.method, Apiconfig.cancellationsave.url, reason1).subscribe((result) => {
          this.router.navigate(['/app/cancellationreason/cancellationlist']);
          this.notifyService.showSuccess("Cancellation Reasons Updated Successfully")
        })
      }
    }
    else {
      if (userAddEditForm.valid) {
        this.submitted = true;
        var data = userAddEditForm.value;
        var reason = {
          status: parseInt(data.status),
          reason: data.reason,
          type: data.cancellation
        }
        console.log("asfesef", reason)
        this.apiService.CommonApi(Apiconfig.cancellationsave.method, Apiconfig.cancellationsave.url, reason).subscribe((result) => {
          this.router.navigate(['/app/cancellationreason/cancellationlist']);
          this.notifyService.showSuccess("Cancellation Reasons Added Successfully")
        })
      }
    }
  }

}
