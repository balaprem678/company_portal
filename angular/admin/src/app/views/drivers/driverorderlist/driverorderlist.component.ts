import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-driverorderlist',
  templateUrl: './driverorderlist.component.html',
  styleUrls: ['./driverorderlist.component.scss']
})
export class DriverorderlistComponent implements OnInit {

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
  add_btn: boolean = false;
  edit_btn: boolean = false;
  view_btn: boolean = false;
  delete_btn: boolean = false;
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

  constructor(private apiService: ApiService, private getSettings: TableSettingsService,
    private route: ActivatedRoute) {
    this.loadsettings('');
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')
    var data = {
      id: this.id,
      limit: this.limit,
      skip: this.skip,
      status: this.status
    }
    if (!this.totalItems || typeof this.totalItems == undefined) {
      this.getUsers(data)
    }
    // this.getUsers(data)
  }



  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.getdriversusers.method, Apiconfig.getdriversusers.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        this.source.load(this.getlistusers);
        this.loadCard_Details(response[2].allValue ? response[2].allValue : 0, response[2].cancelValue ? response[2].cancelValue : 0, response[2].deliverValue[0] ? response[2].deliverValue : 0);
      }
      else {
        this.getlistusers = []
      }
    })
  }

  onDeleteChange(event) {
    // this.ngOnInit();
    window.location.reload();
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

  loadCard_Details(allUsers, activeUsers, inactiveUsers) {
    this.card_details = [
      {
        title: 'ALL Brands',
        value: allUsers,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'ACTIVE Brands',
        value: activeUsers,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
      },
      {
        title: 'INACTIVE Brands',
        value: inactiveUsers,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive'
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
  // onheaderCardChange(event) {
  //   this.skip = 0;
  //   this.source = new LocalDataSource();
  //   let data = {
  //     'skip': this.skip,
  //     'limit': this.limit,
  //     'status': this.global_status,
  //     'search': this.global_search
  //   }
  //   if (event == 'all') {
  //     data.status = 0;
  //     this.global_status = 0;
  //   } else if (event == 'active') {
  //     data.status = 1;
  //     this.global_status = 1;
  //   } else if (event == 'inactive') {
  //     data.status = 2;
  //     this.global_status = 2;
  //   }
  //   // this.loadsettings(event);
  //   this.getUsers(data);
  // }
  loadsettings(event) {
    this.settings = {
      selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        order_id: {
          title: 'Order Id',
          filter: true,
          valuePrepareFunction: value => {
            return value;
          }
        },
        driver: {
          title: 'Driver Name',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value.username;
          }
        },
        usersiddetails: {
          title: 'UserName',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value.username;
          }
        },
        status: {
          title: 'Status',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            if (value && value == 7) {
              return `<p>Delivered</p>`
            }
            else {
              return `<p>Not Delivered</p>`
            }
          }
        },
        billings: {
          title: 'Delivery Fee',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value.amount.delivery_amount;
          }
        },
        delivery_address: {
          title: 'Drop Address',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value.fulladres;
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
  };

}
