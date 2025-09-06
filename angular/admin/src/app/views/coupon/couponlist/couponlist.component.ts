import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-couponlist',
  templateUrl: './couponlist.component.html',
  styleUrls: ['./couponlist.component.scss']
})
export class CouponlistComponent implements OnInit {
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
  view_btn: boolean = true;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/coupon/couponadd';
  addBtnName: string = 'Add Coupons';
  editUrl: string = 'app/coupon/couponedit/';
  viewUrl: string = '/app/coupon/couponview/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  dataid: any;
  deleteApis: apis = Apiconfig.couponsdelete;


  constructor(private apiService: ApiService, private getSettings: TableSettingsService,
    private notifyService: NotificationService, private router: Router, private authService: AuthenticationService) {
      this.curentUser = this.authService.currentUserValue;
      if (this.curentUser && this.curentUser.doc.role == "subadmin") {
        if (this.router.url == '/app/coupon/couponlist' && this.curentUser.doc.privileges) {
          this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Coupons');
          // if (!this.userPrivilegeDetails[0].status.view) {
          //   this.notifyService.showWarning('You are not authorized this module');
          //   this.router.navigate(['/app']);
          // };
          if (this.userPrivilegeDetails[0].status.delete) {
            this.delete_btn = true;
          } else {
            this.delete_btn = false;
            this.bulk_action = false;
          }
          if (this.userPrivilegeDetails[0].status.view) {
            this.view_btn = true;
          } else {
            this.view_btn = false;
          }
          if (this.userPrivilegeDetails[0].status.edit) {
            this.edit_btn = true;
          } else {
            this.edit_btn = false;
          }
          if (this.userPrivilegeDetails[0].status.add) {
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
  }

  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.couponlist.method, Apiconfig.couponlist.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        this.source.load(this.getlistusers);
      }
      else {
        this.getlistusers = []
      }
      console.log("sfs", response)
    })
  }

  onDeleteChange(event) {
    this.ngOnInit();
    window.location.reload();
  };

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    this.skip = 0;
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
    // this.loadsettings(event);
    this.getUsers(data);
  }
  loadsettings(event) {
    this.settings = {
      selectMode: this.delete_btn?'multi':undefined,
      hideSubHeader: true,
      columns: {
        code: {
          title: 'Coupon Code',
          filter: true,
          valuePrepareFunction: value => {
            return value;
          }
        },
        used: {
          title: 'Used Coupon ',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value;
          }
        },
        availablecoupon: {
          title: ' Available Coupon ',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value;
          }
        },
        coupon_type: {
          title: 'Coupon Type',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value.charAt(0).toUpperCase() + value.slice(1);;
          }
        },
        amount_percentage: {
          title: 'Discount value',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value;
          }
        },
        discount_type: {
          title: 'Discount Type',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value;
          }
        },
        status: {
          title: 'Status',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            if (value && value == 1) {
              return `<p>Active</p>`
            }
            else {
              return `<p>InActive</p>`
            }
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
    if (!this.delete_btn) {
      const indexColumn = {
        index: {
          title: 'S No',
          type: 'text',
          valuePrepareFunction: (value, row, cell) => {
            return this.skip + cell.row.index + 1 + '.';
          },
        },
      };

      // Insert `indexColumn` at the beginning of the `columns`
      this.settings.columns = { ...indexColumn, ...this.settings.columns };
    }
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/brand/brand-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  };

}
