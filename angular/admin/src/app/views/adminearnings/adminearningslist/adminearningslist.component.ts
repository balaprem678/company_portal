import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-adminearningslist',
  templateUrl: './adminearningslist.component.html',
  styleUrls: ['./adminearningslist.component.scss']
})
export class AdminearningslistComponent implements OnInit {
  startDate = new UntypedFormControl(new Date());
  endDate = new UntypedFormControl(new Date());
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
  edit_btn: boolean = false;
  view_btn: boolean = false;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/pages/add';
  addBtnName: string = 'Page Add';
  editUrl: string = 'app/cancellationreason/cancellationedit/';
  viewUrl: string = '/app/cancellationreason/cancellationview/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  dataid: any;
  deleteApis: apis = Apiconfig.deleteOrder;
  orderDetails: any;
  getcity: any;
  getcityid: any;
  startdate: any;
  maxDate = new Date();
  minDate = new Date();
  enddate: any;
  endselectdate: boolean = false;
  onFromDate: any;
  onToDate: any;
  citydata: any;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;

  constructor(private apiService: ApiService, private getSettings: TableSettingsService, private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
    private notifyService: NotificationService) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/adminearnings/adminearningslist') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Site Earnings');
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
    this.filter_action_list = [
      {
        name: 'From Date',
        tag: 'input',
        type: 'date',
        value: null
      },
      {
        name: 'To Date',
        tag: 'input',
        type: 'date',
        value: null
      },
    ]
    this.loadsettings('');
  }

  ngOnInit(): void {

    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status
    }
    this.getUsers(data)

    this.apiService.CommonApi(Apiconfig.restaurantcity.method, Apiconfig.restaurantcity.url, {}).subscribe(result => {
      this.getcity = result[0]
      this.getcityid = result[0]._ids
    })
  }

  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.adminearnings.method, Apiconfig.adminearnings.url, getusers).subscribe(result => {
      this.orderDetails = result.orderDetails;
      this.source.load(this.orderDetails);
      this.loadCard_Details(result.count ? result.count : 0, result.admin_total ? result.admin_total.toFixed(2) : 0)
    })
  }

  onDeleteChange(event) {
    this.ngOnInit();
  };

  onFilterData(event) {
    console.log("event", event)
    this.apiService.CommonApi(Apiconfig.restaurantsubcity.method, Apiconfig.restaurantsubcity.url, { value: event._id }).subscribe(result => {
      console.log(result)
    })
  }


  set_start_date(event) {
    this.startdate = event;
  }

  set_end_date(event) {
    this.enddate = event;
    this.endselectdate = true
    console.log("sdsd", this.enddate)
  }

  onsubmit() {
    var data = {
      city: this.getcityid,
      area: "",
      startdate: this.startdate,
      enddate: this.enddate,
      limit: this.limit,
      skip: this.skip,
      search: this.global_search,
      status: 1,
      rest: ""
    }
    this.apiService.CommonApi(Apiconfig.adminearnings.method, Apiconfig.adminearnings.url, data).subscribe(result => {
      console.log(result)
      this.orderDetails = result.orderDetails;
      this.source.load(this.orderDetails);
      this.loadCard_Details(result.count, result.admin_total.toFixed(2))
    })
  }

  onClear() {
    this.onFromDate = " ";
    this.onToDate = " ";
    this.citydata = " "
  }

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

  ngAfterViewInit(): void {
    this.apiService.CommonApi(Apiconfig.productcatgory.method, Apiconfig.productcatgory.url, {}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.store.categoryList.next(result.list ? result.list : []);
        }
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productbrandns.method, Apiconfig.productbrandns.url, {}).subscribe(
      (result) => {
        if (result && result.length == 1) {
          this.store.brandsList.next(result[0].length > 0 ? result[0] : []);
        };
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productcity.method, Apiconfig.productcity.url, {}).subscribe(
      (result) => {
        if (result && result.length > 0) {
          this.store.cityList.next(result[0].length > 0 ? result[0] : []);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  };


  onFilterAction(event) {
    this.source = new LocalDataSource();
    console.log("event", event)
    if (event && event.City != '') {
      this.global_filter_action.city = event.City;
    } else {
      delete this.global_filter_action.city;
    }

    if (event && event.From_Date != '') {
      this.global_filter_action.From_Date = event.From_Date;
    } else {
      delete this.global_filter_action.From_Date;
    }

    if (event && event.To_Date != '') {
      this.global_filter_action.To_Date = event.To_Date;
    } else {
      delete this.global_filter_action.To_Date;
    }

    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.status,
      'search': this.global_search,
    };
    // this.getUsers(data)
    let filterdata = {
      ...data,
      ...this.global_filter_action
    };
    this.apiService.CommonApi(Apiconfig.adminearnings.method, Apiconfig.adminearnings.url, filterdata).subscribe(result => {
      console.log("result", result)
      this.orderDetails = result.orderDetails;
      this.source.load(this.orderDetails);
      this.loadCard_Details(result.count, result.admin_total.toFixed(2))
    })
  }
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

  loadCard_Details(count, admin_total) {
    this.card_details = [
      {
        title: 'Total Orders',
        value: count,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'Total Earnings',
        value: admin_total,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
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
      // selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        index: {
          title: 'S No',
          type: 'text',
          valuePrepareFunction: (value, row, cell) => {
            return this.skip + cell.row.index + 1 + '.'
          }
        },
        order_id: {
          title: 'Order Id',
          filter: true,
          type: 'html',
          valuePrepareFunction: (value, row) => {
            return `<a href="#/app/orders/vieworders/` + row._id + `">${value}</a>`;
          }
        },
        item_total: {
          title: 'Item Amount',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return '₹' + value
          }
        },

        grand_total: {
          title: 'Customer Paid Amount',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return '₹' + value.toFixed(2);
          }
        },
        offer: {
          title: 'Offer Amount',
          filter: true,
          type: "html",
          valuePrepareFunction: (value, row) => {
            // if () {
            //   console.log("rows", row.billings.amount.food_offer_price)
            // }
            console.log("rows", row)
            if (row.billings.amount.food_offer_price > 0) {
              var percentage = (parseInt(row.billings.amount.food_offer_price) / parseInt(row.item_total)) * 100

              console.log("percentage", percentage, row.item_total)
              return '₹' + row.billings.amount.food_offer_price.toFixed(2) + "(" + percentage.toFixed(2) + '%' + ")";
            } else {
              return '₹' + row.billings.amount.food_offer_price.toFixed(2);

            }
          },
        },
       
        modeOfPayment: {
          title: 'Payment Mode',
          filter: true,
          type: "html",
          valuePrepareFunction: value => {
            return value
          }
        },

        delivery: {
          title: 'Delivery Fee',
          filter: true,
          type: "html",
          valuePrepareFunction: (value, row) => {
            return "<span class='badge badge-success badge-pill mb-1'>Free</span>";
          },
        },
        createdAt: {
          title: 'Created At',
          filter: true,
          type: "html",
          valuePrepareFunction: (value, row) => {
            return value ? new DatePipe('en-US').transform(value, 'dd/MM/yyyy, hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy, hh:mm a');
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
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/brand/brand-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  };

}
