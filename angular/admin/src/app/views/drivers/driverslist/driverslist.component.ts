import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PopupComponent } from 'src/app/shared/popup.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-driverslist',
  templateUrl: './driverslist.component.html',
  styleUrls: ['./driverslist.component.scss']
})
export class DriverslistComponent implements OnInit {
  status: any = 0;
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
  deleteApis: apis = Apiconfig.driverdelete;
  add_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = true;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/drivers/adddriver';
  addBtnName: string = 'Add Driver';
  editUrl: string = 'app/drivers/editdriver/';
  viewUrl: string = '/app/drivers/driversview/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  restoreApis: apis = Apiconfig.adminrestore;
  archivedDetails: any;
  id: string;
  data: any;

  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService, private sanitized: DomSanitizer,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
    private route: ActivatedRoute) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/drivers/driverslist' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Drivers ');
        console.log(this.userPrivilegeDetails);

        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete && this.delete_btn) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit && this.edit_btn) {
          this.edit_btn = true;
        } else {
          this.edit_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.view && this.view_btn) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.add && this.add_btn) {
          this.add_btn = true;
        } else {
          this.add_btn = false;
        }
      }
    }
    this.loadsettings('')
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
    this.apiService.CommonApi(Apiconfig.driverslist.method, Apiconfig.driverslist.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        // this.source.load(this.getlistusers);
        this.apiService.CommonApi(Apiconfig.deletelist.method, Apiconfig.deletelist.url, getusers).subscribe(result => {
          this.loadCard_Details(this.getlistdata.allValue || 0, this.getlistdata.activeValue || 0, this.getlistdata.deactivateValue || 0, result[1] ? result[1] : 0);
          if (!this.archivedDetails) {
            this.source.load(this.getlistusers);
          } else {
            this.source.load(result[0]);
            this.totalItems = result[1];
            this.archivedDetails = false;
          }
        })

      }
      else {
        this.getlistusers = []
      }
    })
  }

  onDeleteChange(event) {
    this.ngOnInit();
  };


  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event,
      'status': this.status
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
      'search': this.global_search,
      'status': this.status
    }
    this.getUsers(data);
  };

  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'search': this.global_search,
      'status': this.status
    };
    this.getUsers(data);
  }


  loadCard_Details(allUsers, activeUsers, inactiveUsers, archieveList) {
    this.card_details = [
      {
        title: 'All Brands',
        value: allUsers,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'Active Brands',
        value: activeUsers,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
      },
      {
        title: 'Inactive Brands',
        value: inactiveUsers,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive'
      },
      {
        title: "Archieve Brands",
        value: archieveList,
        bg_color: 'clr-red',
        icon: 'fa fa-user-circle-o',
        click_val: 'archieve'
      },
      // {
      //   title: "TODAY'S USERS",
      //   value: todayUsers,
      //   bg_color: 'delete-user',
      //   icon: 'fa fa-user-circle-o',
      //   click_val: 'today'
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
    } else if (event == 'active') {
      data.status = 1;
      this.global_status = 1;
    } else if (event == 'inactive') {
      data.status = 2;
      this.global_status = 2;
    }
    else if (event == 'archieve') {
      data.status = 0;
      this.global_status = 0;
      this.archivedDetails = true
    }
    // this.loadsettings(event);
    this.getUsers(data);
  }

  changefeatured(id, status) {
    var data = {
      db: "drivers",
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

  loadsettings(event) {

    this.settings = {
      selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        username: {
          title: 'Name',
          filter: true,
          valuePrepareFunction: value => {
            return value;
          }
        },
        main_city: {
          title: 'City',
          filter: true,
          type: 'html',
          valuePrepareFunction: value => {
            return value;
          }
        },
        drivername: {
          title: 'Driver name',
          filter: true,
          valuePrepareFunction: (value, row) => {
            return row.name;
          }
        },
        email: {
          title: 'Email',
          filter: true,
          valuePrepareFunction: value => {
            return value;
          }
        },
        // phone: {
        //   title: 'Phone',
        //   filter: true,
        //   valuePrepareFunction: (value, row) => {
        //     // console.log("value",value)
        //     // console.log("row", row)
        //     return row.phone.code + " " + row.phone.number;
        //   }
        // },
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
        },
        seen_status: {
          title: 'Driver (offline /online)',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            if (value && value == 1) {
              return `<div title="Not Seen" class="not_seen_status"><i class="fa fa-check"></i> </div>`
            } else {
              return `<div title="Seen" class="seen_status"><i class="fa fa-close"></i> </div>`
            }
          }
        },
        _id: {
          title: 'Orders',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return `<a href='admin/#/app/drivers/driverorder/${value}'><i class="fa fa-plus"> </i> </a>`
          }
        },
      },
      pager: {
        display: true,
        perPage: this.default_limit
      },
      actions: {
        add: false,
        edit: false,
        delete: false,
        columnTitle: 'Actions',
        class: 'action-column',
        position: 'right',
        custom: [],
      },
    }
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/units/units-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  };

}
