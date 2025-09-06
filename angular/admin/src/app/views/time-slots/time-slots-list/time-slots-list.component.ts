import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PopupComponent } from 'src/app/shared/popup.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';
import { AfterViewInit, ChangeDetectorRef } from '@angular/core';
// import { ApiService } from 'src/app/_services/api.service';
// import { Apiconfig } from 'src/app/_helpers/api-config';
// import { LocalDataSource } from 'src/app/common-table/table/public-api';
// import { Router, ActivatedRoute } from '@angular/router';
// import { DatePipe } from '@angular/common';
// import { AuthenticationService } from 'src/app/_services/authentication.service';
// import { apis } from 'src/app/interface/interface';
// import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
// import { NotificationService } from 'src/app/_services/notification.service';
import { CommonModalComponent } from 'src/app/shared/common-modal.component';
import { PrivilagesData } from 'src/app/menu/privilages';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
// import { PopupComponent } from 'src/app/shared/popup.component';
@Component({
  selector: 'app-time-slots-list',
  templateUrl: './time-slots-list.component.html',
  styleUrls: ['./time-slots-list.component.scss']
})
export class TimeSlotsListComponent implements OnInit {
  status: any
  getnewuserslist: any[];
  totalItems: any;
  getnewuserlistdata: any;
  getlistusers: any;
  getlistdata: any;
  event_limit: any;
  settings: any;
  env_url: any = environment.apiUrl;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  add_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = false;
  delete_btn: boolean = true;
  deleteApis: apis = Apiconfig.time_slotDelete;
  inactiveApis: apis = Apiconfig.userInactive;
  addBtnUrl: string = '/app/timeSlots/add';
  addBtnName: string = 'Add Time Slot';
  editUrl: string = 'app/timeSlots/edit/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  archivedDetails: boolean = false;
  user_list_filter_action: boolean = true
  activeBulkAction: boolean = true
  db = "timeslots"
  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private apiService: ApiService,
    private sanitized: DomSanitizer,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
    private datePipe: DatePipe
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/timeSlots/list' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Time Slots');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit) {
          this.edit_btn = true;
        } else {
          this.edit_btn = false;
        }
      }
    }
    this.loadsettings('');
  }

  ngOnInit(): void {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status
    }
    this.getUsers(data)

  }
  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.time_slotsList.method, Apiconfig.time_slotsList.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        this.source.load(this.getlistusers);
        this.loadCard_Details(response[2][0].all[0] ? response[2][0].all[0].count : 0, response[2][0].active[0] ? response[2][0].active[0].count : 0, response[2][0].inactive[0] ? response[2][0].inactive[0].count : 0)
      }
    })
  }

  onInactivechange(event) {

    console.log("bgbhsdfgsd", event)
    if (event && event.status == 1) {
      // this.skip = 0;
      this.ngOnInit();
    }
  }
  onDeleteChange(event) {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status,

    }
    this.getUsers(data)
    // this.ngOnInit();
  };

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event
    }
    this.getUsers(data);
  };
  onitemsPerPageChange(event) {
    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': this.global_search
    }
    this.getUsers(data);
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'search': this.global_search
    };
    this.getUsers(data);
  }

  loadCard_Details(allUsers, activeUsers, inactiveUsers) {
    this.card_details = [
      {
        title: 'ALL Time Slots',
        value: allUsers,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'ACTIVE Time Slots',
        value: activeUsers,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
      },
      {
        title: 'INACTIVE Time Slots',
        value: inactiveUsers,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive'
      },
      // {
      //   title: "Archieve Brands",
      //   value: archieveList,
      //   bg_color: 'clr-red',
      //   icon: 'fa fa-user-circle-o',
      //   click_val: 'archieve'
      // },
    ];
  }
  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search
    }
    if (event == 'all') {
      data.status = 0;
      this.global_status = 0;
      this.user_list_filter_action = true
      this.activeBulkAction = true
    } else if (event == 'active') {
      data.status = 1;
      this.global_status = 1;
      this.user_list_filter_action = true
      this.activeBulkAction = false
    } else if (event == 'inactive') {
      data.status = 2;
      this.global_status = 2;
      this.user_list_filter_action = false
      this.activeBulkAction = true
    }
    // this.loadsettings(event);
    this.getUsers(data)

  }
  loadsettings(event) {
    this.settings = {
      selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        weekday: {
          title: 'Week Days',
          filter: true,
          valuePrepareFunction: value => {
            return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
          }
        },
        slottime: {
          title: 'Slot Time',
          filter: true,
          valuePrepareFunction: value => {
            return value + ' mins';
          }
        },
        time_start: {
          title: 'Start Time',
          filter: true,
          valuePrepareFunction: value => {
            return this.datePipe.transform(value, 'hh:mm aa');
          }
        },
        time_end: {
          title: 'End Time',
          filter: true,
          valuePrepareFunction: value => {
            return this.datePipe.transform(value, 'hh:mm aa');
          }
        },
        status: {
          title: 'Status',
          filter: false,
          type: 'custom',
          renderComponent: PopupComponent,
          sort: false,
          editable: true,
          onComponentInitFunction: (instance: any) => {
            instance.save.subscribe(row => {
              this.changefeatured(row._id, row.status);
            });
          }
        }


      },
      pager: {
        display: true,
        perPage: this.default_limit
      },
      actions: {
        add: true,
        edit: false,
        delete: false,
        columnTitle: 'Actions',
        class: 'action-column',
        position: 'right',
        custom: [],
      },
    }
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/brand/brand-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  }
  changefeatured(id, status) {
    var data = {
      db: "timeslots",
      id: id,
      value: 1
    };
    if (status == 1) {
      data.value = 2;
    }
    this.apiService.CommonApi(Apiconfig.changeStatus.method, Apiconfig.changeStatus.url, data).subscribe(response => {
      if (response && response.status == 1) {
        this.notifyService.showSuccess("Successfully Updated");
        this.ngOnInit();
      } else {
        this.notifyService.showError("Something went wrong. Please try again later.");
      }
    })
  }

}
