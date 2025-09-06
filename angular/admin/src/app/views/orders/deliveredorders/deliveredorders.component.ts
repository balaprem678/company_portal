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
import { UntypedFormControl } from '@angular/forms';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { exportsapi } from 'src/app/interface/interface';
import { NotificationService } from 'src/app/_services/notification.service';
import { DownloadButtonComponent } from 'src/app/shared/download-button.component';
import { viewdetailsComponent } from 'src/app/shared/view-details.component';

@Component({
  selector: 'app-deliveredorders',
  templateUrl: './deliveredorders.component.html',
  styleUrls: ['./deliveredorders.component.scss']
})
export class DeliveredordersComponent implements OnInit {
  startDate = new UntypedFormControl(new Date());
  endDate = new UntypedFormControl(new Date());
  status: any = 7;
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
  viewUrl: string = '/app/orders/vieworders/';
  card_details: any[] = [];
  global_search: string;
  bulk_action: boolean = true;
  startdate: any;
  enddate: any;
  getcity: any;
  getcityid: any;
  minDate = new Date();
  maxDate = new Date();
  myDateValue1: any;
  onToDate: string;
  myDateValue: Date;
  onFromDate: string | number | Date;
  subcity: any;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;
  export_btn: boolean = true;
  exportApis: exportsapi = Apiconfig.exportdashboardorder;
  curreny_symbol: any;
  updateTheOrders:boolean=true;
  cancelTheOrder:boolean=true;

  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService, private sanitized: DomSanitizer, private getSettings: TableSettingsService,
    private store: DefaultStoreService, private notifyService: NotificationService,) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/orders/deliveredorders' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Orders');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.cancelTheOrder = true;
        } else {
          this.cancelTheOrder = false;
        }
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.export) {
          this.export_btn = true;
        } else {
          this.export_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit) {
          this.updateTheOrders = true;
        } else {
          this.updateTheOrders = false;
        }
     
      }
    }
    this.filter_action_list = [

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
    if (!this.totalItems || typeof this.totalItems == undefined) {
      this.getUsers(data)
    }
    this.getUsers(data)
    this.apiService.CommonApi(Apiconfig.restaurantcity.method, Apiconfig.restaurantcity.url, {}).subscribe(result => {
      this.getcity = result[0]
      this.getcityid = result[0]._id
    })
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
      console.log(result.currency_symbol, "settingssettingssettingssettingssettingssettingssettingssettings");
      this.curreny_symbol = result && result.currency_symbol != (undefined || null) && result.currency_symbol ? result.currency_symbol : "₹"
    })
  }

  // onexportChange(event) {
  //   console.log("sdfsdf", event)
  //   this.source = new LocalDataSource();
  //   let data = {
  //     'skip': this.skip,
  //     'limit': this.limit,
  //     'from_date': this.from,
  //     'to_date': this.to
  //   }
  // }


  onexportChange(event) {
    var data:any = {
      status: this.status,
      city: this.global_filter_action.city,
      start_date: this.global_filter_action.From_Date,
      end_date: this.global_filter_action.To_Date,
      area: '',
      rest: ''
    }
    data.file_name='delivered_orders';

    this.apiService.CommonApi(this.exportApis.method, this.exportApis.url, data).subscribe(
      (result) => {
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


  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.orderslist.method, Apiconfig.orderslist.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        this.source.load(this.getlistusers);
      }
      else {
        this.getlistusers = []
      }
    })
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



  set_start_date(event) {
    this.startdate = event;
  }

  set_end_date(event) {
    this.enddate = event;
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

  onclear() {
    this.onToDate = ""
    this.onFromDate = ""
    this.getcity = ""
  }


  onFilterData(event) {
    this.subcity = event._id
    this.apiService.CommonApi(Apiconfig.restaurantsubcity.method, Apiconfig.restaurantsubcity.url, { value: event._id }).subscribe(result => {
    })
  }

  onFilterAction(event) {
    this.source = new LocalDataSource();
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
    let filterdata = {
      ...data,
      ...this.global_filter_action
    };
    this.apiService.CommonApi(Apiconfig.showorderlist.method, Apiconfig.showorderlist.url, filterdata).subscribe(result => {
      this.source.load(result[0] == 0 ? [] : result[0]);
      this.totalItems = result[1];
    })
  }

  onsubmit() {
    var data = {
      city: this.getcityid,
      area: "",
      startdate: this.startdate,
      enddate: this.enddate,
      limit: this.limit,
      skip: this.skip,
      status: this.status,
      rest: ""
    }
    this.apiService.CommonApi(Apiconfig.showorderlist.method, Apiconfig.showorderlist.url, data).subscribe(result => {
      this.source.load(result[0] == 0 ? " " : result[0]);
    })
  }

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event,
      'status': this.status,
      'start_date': this.onFromDate ? this.onFromDate : '',
      'end_date': this.onToDate ? this.onToDate : '',
      'area': '',
      'city': this.subcity ? this.subcity : ''
    }
    this.apiService.CommonApi(Apiconfig.showorderlist.method, Apiconfig.showorderlist.url, data).subscribe(result => {
      this.source.load(result[0] == 0 ? " " : result[0]);
    })
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
      'status': this.status,
      'start_date': this.onFromDate ? this.onFromDate : '',
      'end_date': this.onToDate ? this.onToDate : '',
      'area': '',
      'city': this.subcity ? this.subcity : ''
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
      'start_date': this.onFromDate ? this.onFromDate : '',
      'end_date': this.onToDate ? this.onToDate : '',
      'area': '',
      'city': this.subcity ? this.subcity : ''
    };
    this.getUsers(data);
  }
  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.status,
      'search': this.global_search
    }
    if (event == 'all') {
      data.status = 0;
      this.status = 0;
    } else if (event == 'active') {
      data.status = 1;
      this.status = 1;
    } else if (event == 'inactive') {
      data.status = 2;
      this.status = 2;
    }
    // this.loadsettings(event);
    this.getUsers(data);
  }

  getOderDetails(id: any) {
    this.apiService.CommonApi(Apiconfig.getorders.method, Apiconfig.getorders.url, { id: id }).subscribe((result) => {
      console.log(result, "getOderDetailsgetOderDetailsgetOderDetailsgetOderDetails");

    })
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
            return this.skip + cell.row.index + 1 + '.';
          },
        },
        order_id: {
          title: 'Order Id',
          filter: true,
          valuePrepareFunction: value => {
            return value;
          }
        },
        Usernumber: {
          title: 'Customer Phone ',
          filter: false,
          valuePrepareFunction: (value, row) => {

            return row && row.user && row.user.phone && (row.user.phone.number != (null || undefined || '')) && row.user.phone.number ?  row.user.phone.number: row.delivery_address.phone;
          }
        },
        product: {
          title: 'Product',
          filter: true,
          type: 'custom',
          renderComponent: viewdetailsComponent,
          sort: false,
          editable: true,
          onComponentInitFunction: (instance: any) => {
            instance.save.subscribe(row => {
              // this.changeStatus(row._id, row.status);
              
              this.getOderDetails(row._id)
            });
          }
        },

        createdAt: {
          title: 'Order Date',
          filter: true,
          type: "html",
          valuePrepareFunction: (value, row) => {
            return value ? new DatePipe('en-US').transform(value, 'dd/MM/yyyy, hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy, hh:mm a');
          }
        },
        amount: {
          title: 'Amount ',
          filter: true,
          valuePrepareFunction: (value, row) => {
            console.log(row.user, "row")
            return (this.curreny_symbol + row && row.billings && row.billings.amount && row.billings.amount.grand_total);

            // return value.username;
          }
        },
        
        transactions: {
          title: 'Payment Method',
          filter: true,
          valuePrepareFunction: (value, row) => {
            console.log(row, "row111111111111111111111111111111111111111111--------------------")
            return (row && row.transactions[0] && row.transactions[0].type != undefined ? row.transactions[0].type : '');

            // return "_"
          }
        },
        // drivername: {
        //   title: 'User Name ',
        //   filter: true,
        //   valuePrepareFunction: (value, row) => {
        //     return row.user.username;
        //   }
        // },
        // username: {
        //   title: 'Customer',
        //   filter: true,
        //   valuePrepareFunction: (value, row) => {
        //     // return (row.user.first_name.charAt(0).toUpperCase() + row.user.first_name.substr(1).toLowerCase()) + " " + (row.user.last_name.charAt(0).toUpperCase() + row.user.last_name.substr(1).toLowerCase());
        //     // return ( row && row.user && row.user.username ? row.user.username : "username");
        //     // return row.user.username;
        //     if(value && value.user && value.user.first_name && value.user.first_name != (undefined || null || '')){
        //       return (value.user.first_name.charAt(0).toUpperCase() + value.user.first_name.substr(1).toLowerCase()) + " " + (value.user.last_name.charAt(0).toUpperCase() + value.user.last_name.substr(1).toLowerCase());
        //     }else{
        //       return ( value && value.user && value.user.username ? value.user.username : "-");
        //     }
        //   }
        // },
        // user: {
        //   title: 'Customer Phone',
        //   filter: false,
        //   valuePrepareFunction: value => {
        //     // return value.phone.code + ' ' + value.phone.number;
        //     return value && value.user && value.user.phone && (value.user.phone.number != (null || undefined || '')) && value.user.phone.number ? value.user.phone.number: "-";

        
        //     // return value && value.user && value.user.phone && (value.user.phone.code != (null || undefined || ''))? value.user.phone.code + ' ' + value && value.user && value.user.phone && (value.user.phone.number != (null || undefined || '')) && value.user.phone.number : "-";
        //   }
        // },
        // driver: {
        //   title: 'Driver Name',
        //   filter: false,
        //   valuePrepareFunction: value => {
        //     return value.username ? value.username : ''
        //   }
        // },
   
        status: {
          title: 'Order status',
          filter: false,
          type: 'html',
          valuePrepareFunction: value => {
            if (value == 7) {
              return "<span class='badge badge-success badge-pill mb-1'>Order Delivered</span>";
            } else if (value == 8) {
              return "<span class='badge badge-success badge-pill mb-1'>Order Delivered</span>";
            }
          }
        },
        // createdAt: {
        //   title: 'Created At',
        //   filter: true,
        //   type: "html",
        //   valuePrepareFunction: (value, row) => {
        //     return value ? new DatePipe('en-US').transform(value, 'dd/MM/yyyy, hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy, hh:mm a');
        //   }
        // },
        invoice: {
          title: 'Invoice',
          type: 'custom',
          renderComponent: DownloadButtonComponent,
          onComponentInitFunction: (instance: DownloadButtonComponent) => {
            instance.download.subscribe(row => {
              console.log('Download clicked for row:', row);
              // Call your download logic here
            });
          },
        },
        
        // seen_status: {
        //   title: 'Seen Status',
        //   filter: true,
        //   type: "html",
        //   valuePrepareFunction: value => {
        //     if (value && value == 1) {
        //       return `<div title="Seen" class="seen_status"><i class="fa fa-eye"></i> </div>`
        //     }
        //     else {
        //       return `<div title="Not Seen" class="not_seen_status"><i class="fa fa-eye-slash"></i> </div>`
        //     }
        //   }
        // }

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
        custom: [],
      },
    }
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/orders/usercancelledorders', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  };



}
