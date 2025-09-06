import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { environment } from 'src/environments/environment';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser'
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { apis } from 'src/app/interface/interface';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-brand-list',
  templateUrl: './brand-list.component.html',
  styleUrls: ['./brand-list.component.scss']
})
export class BrandListComponent implements OnInit {

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
  add_btn: boolean = false;
  edit_btn: boolean = true;
  view_btn: boolean = false;
  delete_btn: boolean = true;
  deleteApis: apis = Apiconfig.brandDelete;
  addBtnUrl: string = '/app/pages/add';
  addBtnName: string = 'Page Add';
  editUrl: string = 'app/brand/brand-edit/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  archivedDetails: boolean = false;
  restoreApis: apis = Apiconfig.brandRestore;
  archievedList: any;

  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService, private sanitized: DomSanitizer, private getSettings: TableSettingsService,
    private notifyService: NotificationService) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/brand/brand-list' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Brand');
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
    this.loadsettings('');
  }

  ngOnInit(): void {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status
    }
    if (!this.totalItems || typeof this.totalItems == undefined) {
      this.getUsers(data)
    }
    this.getUsers(data)
  }

  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.brands.method, Apiconfig.brands.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        this.loadsettings('');
        this.apiService.CommonApi(Apiconfig.archievelist.method, Apiconfig.archievelist.url, getusers).subscribe(result => {
          this.loadCard_Details(response[2][0].all[0] ? response[2][0].all[0].count : 0, response[2][0].active[0] ? response[2][0].active[0].count : 0, response[2][0].inactive[0] ? response[2][0].inactive[0].count : 0, result[1] ? result[1] : 0);
          if (!this.archivedDetails) {
            this.source.load(this.getlistusers)
          } else {
            this.loadsettings('archived');
            this.source.load(result[0]);
            this.totalItems = result[1]
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
      this.archivedDetails = true;
    }
    // this.loadsettings(event);
    this.getUsers(data)

  }
  loadsettings(event) {
    if (event == 'archived') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          brandname: {
            title: 'Brand name',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          img: {
            title: 'Image ',
            filter: true,
            type: "html",
            valuePrepareFunction: image => {
              return '<img src="' + environment.apiUrl + image + '" width="32" height="32">';
            }
          },
          status: {
            title: 'Status ',
            filter: true,
            valuePrepareFunction: image => {
              return 'Archived';
            }
          },

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
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          brandname: {
            title: 'Brand name',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          img: {
            title: 'Image ',
            filter: true,
            type: "html",
            valuePrepareFunction: image => {
              return '<img src="' + environment.apiUrl + image + '" width="32" height="32">';
            }
          },

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
  }

}
