import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-addedit-vehicle',
  templateUrl: './addedit-vehicle.component.html',
  styleUrls: ['./addedit-vehicle.component.scss']
})
export class AddeditVehicleComponent implements OnInit {
  @ViewChild('vehiFieldForm') form: UntypedFormGroup;
  id: any;
  myBooleanValue: any;
  vehicleDetails: any;
  curentUser: any;
  userPrivilegeDetails: any;
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
      if (this.router.url == '/app/vehicle/add' || (split.length > 0 && split[2] == 'vehicle')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'vehicle');
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
    var view = this.router.url.split('/')
    console.log(view[3]);
    this.myBooleanValue = view[3] == 'view' ? true : false;
  }

  ngOnInit(): void {
    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.editvehicle.method, Apiconfig.editvehicle.url, { id: this.id }).subscribe(
        (result) => {
          this.vehicleDetails = result;
          if (!this.myBooleanValue) {
            this.form.controls['vehicle_name'].setValue(result.vehicle_name)
            this.form.controls['status'].setValue(result.status)
          }
        })
    }

  }

  onSubmit(vehiFieldForm: UntypedFormGroup) {
    var details = vehiFieldForm.value;
    if (vehiFieldForm.status != 'INVALID') {
      var data = {
        vehicle_name: details.vehicle_name ? details.vehicle_name : '',
        status: details.vehicle_name ? details.status : 2,
        _id: this.id ? this.id : '',
      }
      this.apiService.CommonApi(Apiconfig.savevehicle.method, Apiconfig.savevehicle.url, data).subscribe(
        (result) => {
          this.router.navigate(['/app/vehicle/list']);
          this.notifyService.showSuccess("Successfully updated.");
        }, (error) => {
          this.notifyService.showError(error);
          this.cd.detectChanges();
          window.location.reload()
        })

    }

  }

}
