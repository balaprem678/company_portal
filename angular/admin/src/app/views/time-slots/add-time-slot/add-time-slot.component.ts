import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-add-time-slot',
  templateUrl: './add-time-slot.component.html',
  styleUrls: ['./add-time-slot.component.scss']
})
export class AddTimeSlotComponent implements OnInit {
  @ViewChild('categoryForm') form: FormGroup;
  pagetitle: any;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  site_url: any;
  id: any;
  minTime: Date;
  minTimeStart: Date;
  selectedWeekday: string;
  dropdownBorderRadius1: number = 5
  statusOptions = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 2 }
  ];
  selectedStatus: number = null;
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
    private dateFormate: DatePipe
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    this.pagetitle = split[3][0].toLocaleUpperCase() + split[3].slice(1, split[3].length)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/timeSlots/add' || (split.length > 0 && split[2] == 'Time Slots')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Time Slots');
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
    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.time_slotsEdit.method, Apiconfig.time_slotsEdit.url, { id: this.id }).subscribe(
        (result) => {
          this.form.controls['weekday'].setValue(result[0].weekday)
          this.form.controls['slottime'].setValue(result[0].slottime)
          this.form.controls['starttime'].setValue(result[0].time_start)
          this.form.controls['endtime'].setValue(result[0].time_end)
          this.form.controls['status'].setValue(result[0].status)
        })
    }
  }

  onSubmit(categoryForm: UntypedFormGroup) {
    var details = categoryForm.value;
    var starttime = new Date(categoryForm.value.starttime);
    var endtime = new Date(categoryForm.value.endtime);
    if (!(starttime <= this.minTimeStart) || !(endtime >= this.minTime)) {
      this.notifyService.showError('Please enter valid time.')
      return;
    }
    if (categoryForm.status != "INVALID" && details.slottime < 999) {
      var data = {
        slottime: details.slottime,
        status: details.status,
        time_end: details.endtime,
        time_start: details.starttime,
        weekday: details.weekday,
        _id: this.id ? this.id : ''
      }
      this.apiService.CommonApi(Apiconfig.time_slotsSave.method, Apiconfig.time_slotsSave.url, { value: data }).subscribe(
        (result) => {
          console.log(result,'this is the result');
          // if (result && (result._id || result.nModified > 0)) {
          if (result.status) {
            this.router.navigate(['/app/timeSlots/list']);
            this.notifyService.showSuccess("Successfully updated.");
          } else {
            this.notifyService.showError(result.result);
            console.log(result);
          }
        }, (error) => {
          this.notifyService.showError("Something went wrong.");
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

  startTimeChanger(event) {
    var slottime = this.form.value.slottime
    this.minTime = new Date(event)
    this.minTime.setMinutes(this.minTime.getMinutes() + slottime)
  }
  validateInput(event: any) {
    // Remove any non-digit characters
    let inputValue = event.target.value.replace(/\D/g, '');
    
    // Ensure the input length does not exceed 4 characters
    if (inputValue.length > 4) {
        inputValue = inputValue.slice(0, 4);
    }
    
    // Update the input value with the sanitized value
    event.target.value = inputValue;
}
  endTimeChanger(event) {
    var slottime = this.form.value.slottime
    this.minTimeStart = new Date(event)
    this.minTimeStart.setMinutes(this.minTimeStart.getMinutes() - slottime)
  }

  slotTimeChange(event) {
    this.startTimeChanger(this.form.value.starttime)
    this.endTimeChanger(this.form.value.endtime)
  }
}
