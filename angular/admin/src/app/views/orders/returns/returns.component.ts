import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis, exportsapi } from 'src/app/interface/interface';
import { OrderManageComponent } from 'src/app/shared/order-manage.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-returns',
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.scss']
})
export class ReturnsComponent {
  startDate = new UntypedFormControl(new Date());
  endDate = new UntypedFormControl(new Date());
  status: any = 16;
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
  view_btn: boolean = true;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/pages/add';
  addBtnName: string = 'Page Add';
  editUrl: string = 'app/brand/brand-edit/';
  viewUrl: string = '/app/orders/return-vieworders/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  getcity: any;
  maxDate = new Date();
  minDate = new Date();
  startdate: any;
  enddate: any;
  to_dates: string;
  _dates: string;
  fromDate: any;
  from_mindate: string;
  getcityid: any;
  subcity: any;
  myDateValue1: any;
  onToDate: string;
  myDateValue: Date;
  onFromDate: string | number | Date;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;
  export_btn: boolean = true;
  exportApis: exportsapi = Apiconfig.exportdashboardorder;
  deleteApis: apis = Apiconfig.cancelOrder;

  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService, private sanitized: DomSanitizer, private getSettings: TableSettingsService,
    private store: DefaultStoreService, private notifyService: NotificationService, private cd: ChangeDetectorRef) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/orders/packedorders') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Orders');
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
    this.filter_action_list = [
      // {
      //   name: 'City',
      //   tag: 'select',
      //   type: '',
      // },
      {
        name: 'From Date',
        tag: 'input',
        type: 'date',
      },
      {
        name: 'To Date',
        tag: 'input',
        type: 'date',
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
    // if (!this.totalItems || typeof this.totalItems == undefined) {
    //   this.getUsers(data)
    // }
    this.getUsers(data)
    this.apiService.CommonApi(Apiconfig.restaurantcity.method, Apiconfig.restaurantcity.url, {}).subscribe(result => {
      this.getcity = result[0]
      this.getcityid = result[0]._id
    })
  }

  set_start_date(event) {
    this.startdate = event;
  }

  set_end_date(event) {
    this.enddate = event;
  }

  onDeleteChange(event) {
    this.ngOnInit();
  };


  onsubmit() {
    var data = {
      city: this.getcityid,
      area: "",
      startdate: this.startdate,
      enddate: this.enddate,
      limit: this.limit,
      skip: this.skip,
      status: 16,
      rest: ""
    }
    this.apiService.CommonApi(Apiconfig.returnOrderslist.method, Apiconfig.returnOrderslist.url, data).subscribe(result => {
      console.log(result, 'this is the result');

      this.source.load(result[0] == 0 ? " " : result[0]);
    })
  }


  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.returnOrderslist.method, Apiconfig.returnOrderslist.url, getusers).subscribe(response => {
      console.log(response, 'this is the response');

      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        this.cd.detectChanges();
        this.source.load(this.getlistusers);
      }
      else {
        this.source.load([]);
        this.getlistusers = []
      }
    })
  }
  fromdateStarted() {
    if (this.myDateValue1) {
      this.onToDate = ""
    }
    else {
      this.myDateValue = new Date(this.onFromDate);
    }
  }

  ToDateStarted() {
    this.myDateValue1 = new Date(this.onToDate);
  }


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

  onFilterData(event) {
    this.subcity = event._id
    this.apiService.CommonApi(Apiconfig.restaurantsubcity.method, Apiconfig.restaurantsubcity.url, { value: event._id }).subscribe(result => {
    })
  }

  onFilterAction(event) {
    this.source = new LocalDataSource();
    console.log("event", event)
    if (event && event.City != '') {
      this.global_filter_action.city = event.City;
    } else {
      delete this.global_filter_action.city;
    }

    if (event && event.From_Date != '') {
      this.global_filter_action.start_date = event.From_Date;
    } else {
      delete this.global_filter_action.start_date;
    }

    if (event && event.To_Date != '') {
      this.global_filter_action.end_date = event.To_Date;
    } else {
      delete this.global_filter_action.end_date;
    }

    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.status,
      'search': this.global_search,
    };
    let filterdata = {
      ...data,
      ...this.global_filter_action
    };
    this.apiService.CommonApi(Apiconfig.returnOrderslist.method, Apiconfig.returnOrderslist.url, filterdata).subscribe(result => {
      this.source.load(result[0] == 0 ? [] : result[0]);
      this.totalItems = result[1]
    })
  }


  onexportChange(event) {
    console.log(event)
    var data = {
      status: this.status,
      city: this.global_filter_action.city,
      start_date: this.global_filter_action.From_Date,
      end_date: this.global_filter_action.To_Date,
      area: '',
      rest: ''
    }
    this.apiService.CommonApi(this.exportApis.method, this.exportApis.url, data).subscribe(
      (result) => {
        console.log("result", result)
        if (result && result.status == 1) {
          window.open(environment.apiUrl + 'uploads/csv/orders/' + result.message.filename + '.' + result.message.type);
          console.log(environment.apiUrl + 'uploads/csv/orders/' + result.message.filename + '.' + result.message.type)
          this.notifyService.showSuccess("File downloaded successfully");
        } else {
          this.notifyService.showError(result.message);
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )
  }

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event,
      'status': this.status,
      'area': '',
      'city': this.subcity,
      'rest': '',
      'start_date': this.startdate ? this.startdate : '',
      'end_date': this.enddate ? this.enddate : ''
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
      'search': event,
      'status': this.status,
      'area': '',
      'city': this.subcity,
      'rest': '',
      'start_date': this.startdate ? this.startdate : '',
      'end_date': this.enddate ? this.enddate : ''
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
      'status': this.status,
      'area': '',
      'city': this.subcity,
      'rest': '',
      'start_date': this.startdate ? this.startdate : '',
      'end_date': this.enddate ? this.enddate : ''
    };
    this.getUsers(data);
  }
  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
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
        user: {
          title: 'Customer',
          filter: true,
          valuePrepareFunction: (value, row) => {
            // return (row.user.first_name.charAt(0).toUpperCase() + row.user.first_name.substr(1).toLowerCase()) + " " + (row.user.last_name.charAt(0).toUpperCase() + row.user.last_name.substr(1).toLowerCase());
            if(row && row.user && row.user.first_name && row.user.first_name != (undefined || null || '')){
              return (row.user.first_name.charAt(0).toUpperCase() + row.user.first_name.substr(1).toLowerCase()) + " " + (row.user.last_name.charAt(0).toUpperCase() + row.user.last_name.substr(1).toLowerCase());
            }else{
              return ( row && row.user && row.user.username ? row.user.username : "username");
            }
            // return row.user.username;
          }
        },
        phone: {
          title: 'Customer Phone',
          filter: true,
          valuePrepareFunction: (value, row) => {
            return row.user.phone.code + " " + row.user.phone.number;
          }
        },
        // driver: {
        //   title: 'Driver Name',
        //   filter: true,
        //   valuePrepareFunction: (value) => {
        //     return value.username
        //   }
        // },
        // driver_phone: {
        //   title: 'Driver Phone',
        //   filter: true,
        //   valuePrepareFunction: (row, value) => {
        //     return value.driver ? value.driver.phone.code + " " + value.driver.phone.number : '';
        //   }
        // },
        // driver_status: {
        //   title: 'Driver status',
        //   filter: true,
        //   valuePrepareFunction: (row, value) => {
        //     return value.driver ? value.driver.status == 1 ? "Delivered" : '' : '';
        //   }
        // },
        status: {
          title: 'Order Status',
          filter: true,
          type: 'custom',
          renderComponent: OrderManageComponent,
          sort: false,
          editable: true,
          onComponentInitFunction: (instance: any) => {
            instance.save.subscribe(row => {
              this.changeStatus(row._id,row.foods.id, row.foods.status);
            });
          }
        },
        'foods': {
          title: 'Return Date',
          filter: false,
          valuePrepareFunction: value => {
            var date = value.return_date ? new DatePipe('en-US').transform(value.return_date, 'MMMM dd,yyyy hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy');
            return date ;
          }
        },
        // _id: {
        //   title: 'Assign Driver',
        //   filter: true,
        //   type: "html",
        //   valuePrepareFunction: (row, value) => {
        //     if (value && value.status == 3) {
        //       return `<a href='#/app/orders/assigndriver/${value._id}' class="GFG"><button type ="button"> Assign Driver</button> </a>`
        //     }
        //   }
        // },
      },
      pager: {
        display: true,
        perPage: this.default_limit
      },
      actions: {
        add: true,
        edit: false,
        delete: false,
        view: true,
        columnTitle: 'Actions',
        class: 'action-column',
        position: 'right',
        custom: [
          {
            name: "Assign Driver",
            title: "Assign Driver"
          }
        ],
      },
    }
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/orders/usercancelledorders', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  };

  changeStatus(id,product_id, status) {
    if (id && status) {
      this.apiService.CommonApi(Apiconfig.returnOrderStatus.method, Apiconfig.returnOrderStatus.url, { id: id,product_id:product_id, status: 17 }).subscribe(result => {
        if (result && result.status) {
          this.notifyService.showSuccess(result.message || 'Updated Successfully');
          var data = {
            limit: this.limit,
            skip: this.skip,
            status: this.status
          }
          this.getUsers(data);
        } else {
          this.notifyService.showError(result.message || 'Something went wrong');
        }
      })
    } else {
      this.notifyService.showError('Order object id or status is required')
    }
  }
}
