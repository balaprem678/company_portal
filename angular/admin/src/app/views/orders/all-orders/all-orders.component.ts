import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis, exportsapi } from 'src/app/interface/interface';
import { OrderManageComponent } from 'src/app/shared/order-manage.component';
import { viewdetailsComponent } from 'src/app/shared/view-details.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';
import { OrderCancelComponent } from 'src/app/shared/order-cancel-componet';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { DownloadButtonComponent } from 'src/app/shared/download-button.component';
@Component({
  selector: 'app-all-orders',
  templateUrl: './all-orders.component.html',
  styleUrls: ['./all-orders.component.scss']
})
export class AllOrdersComponent {
  startDate = new UntypedFormControl(new Date());
  endDate = new UntypedFormControl(new Date());
  status: any = 1
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
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  getcity: any;
  maxDate = new Date();
  minDate = new Date();
  startdate: any;
  enddate: any;
  to_dates: string;
  _dates: string;
  fromDate: any;
  from_mindate: string;
  onFromDate: any;
  onToDate: any;
  getcityid: any;
  getcityarea: any;
  myDateValue = new Date();
  myDateValue1: Date;
  subcity: any;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;
  export_btn: boolean = true;
  exportApis: exportsapi = Apiconfig.exportdashboardorder;
  deleteApis: apis = Apiconfig.deleteOrder;
  selectedTab: string = 'allOrders';
  updateTheOrders:boolean=true;

  curreny_symbol: any
  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService, private sanitized: DomSanitizer, private getSettings: TableSettingsService,
    private store: DefaultStoreService, private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
    private modalRef: BsModalRef,
  ) {
    //landingData
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
      console.log(result.currency_symbol, "settingssettingssettingssettingssettingssettingssettingssettings");
      this.curreny_symbol = result && result.currency_symbol != (undefined || null) && result.currency_symbol ? result.currency_symbol : "₹"
    })

    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/orders/allorders' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Orders');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        // if (this.userPrivilegeDetails[0].status.delete) {
        //   this.delete_btn = true;
        // } else {
        //   this.delete_btn = false;
        //   this.bulk_action=false;
        // }
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
    this.apiService.CommonApi(Apiconfig.allorderlist.method, Apiconfig.allorderlist.url, {}).subscribe(result => {
      console.log(result, "resultresultresultresultresult");

    })
  }
  set_start_date(event) {
    if (this.enddate) {
      this.enddate = " "
    }
    else {
      this.startdate = event;
    }
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
    this.getcityarea = ""
  }

  onexportChange(event) {
    var data:any = {
      status: this.status,
      city: this.global_filter_action.city,
      start_date: this.global_filter_action.From_Date,
      end_date: this.global_filter_action.To_Date,
      area: '',
      rest: ''
    }
    data.file_name='all-orders';
    this.apiService.CommonApi(this.exportApis.method, this.exportApis.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          window.open(environment.apiUrl + 'uploads/csv/orders/' + result.message.filename + '.' + result.message.type);
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

  onDeleteChange(event) {
    this.ngOnInit();
  };

  selectTab(tab: string) {
    this.selectedTab = tab;
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
    this.apiService.CommonApi(Apiconfig.allorderlist.method, Apiconfig.allorderlist.url, data).subscribe(result => {
      this.source.load(result[0] == 0 ? " " : result[0]);
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
      this.global_filter_action.From_Date = event.From_Date;
    }
    else {
      delete this.global_filter_action.start_date;
    }
    // else {
    //   this.global_filter_action.From_Date = new Date()
    //   this.notifyService.showInfo("From Date will be considered as Today's Date")
    //   // delete this.global_filter_action.From_Date;
    // }

    if (event && event.To_Date != '') {
      this.global_filter_action.To_Date = event.To_Date;
    }
    else {
      delete this.global_filter_action.end_date;
    }
    // else {
    //   this.global_filter_action.To_Date = new Date()
    //   this.notifyService.showInfo("To Date will be considered as Today's Date")

    //   // delete this.global_filter_action.To_Date;
    // }

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
    this.apiService.CommonApi(Apiconfig.allorderlist.method, Apiconfig.allorderlist.url, filterdata).subscribe(result => {
      console.log(result, 'this is the result');
      console.log("dasdadsd");
      this.modalRef.hide()

      this.source.load(result[0] == 0 ? [] : result[0]);
      this.totalItems = result[1];
    })
  }

  getOderDetails(id: any) {
    this.apiService.CommonApi(Apiconfig.getorders.method, Apiconfig.getorders.url, { id: id }).subscribe((result) => {
      console.log(result, "getOderDetailsgetOderDetailsgetOderDetailsgetOderDetails");

    })
  }

  getUsers(getusers) {
    let filterdata = {
      ...getusers,
      ...this.global_filter_action
    };
    this.apiService.CommonApi(Apiconfig.allorderlist.method, Apiconfig.allorderlist.url, filterdata).subscribe(response => {
      console.log(response, 'response------------------');

      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        console.log(this.totalItems, 'totalItems');

        this.getlistdata = response[2];
        this.source.load(this.getlistusers);
        this.cd.detectChanges();
        this.modalRef.hide()
      }
      else {
        this.source.load([]);
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


  onFilterData(event) {
    this.subcity = event._id
    this.apiService.CommonApi(Apiconfig.restaurantsubcity.method, Apiconfig.restaurantsubcity.url, { value: event._id }).subscribe(result => {
    })
  }

  onSearchChange(event) {
    // console.log("evenyyyyy", event)
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
    // this.getUsers(data);
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

    if(!this.updateTheOrders){
      this.settings = {
        // selectMode: this.delete_btn?'multi':undefined,
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
            title: 'Order ID',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          user: {
            title: 'Customer ',
            filter: true,
            valuePrepareFunction: (value, row) => {
              console.log(row.user, "row")
              if(row.guestLogin){
                return (row && row.delivery_address && row.delivery_address.first_name ? `${row.delivery_address.first_name} (Guest)` : "username");
              }
              if (row && row.user && row.user.first_name && row.user.first_name != (undefined || null || '')) {
                return (row.user.first_name.charAt(0).toUpperCase() + row.user.first_name.substr(1).toLowerCase()) + " " + (row.user.last_name.charAt(0).toUpperCase() + row.user.last_name.substr(1).toLowerCase());
              } else {
                return (row && row.user && row.user.username ? row.user.username : "username");
              }
  
              // return value.username;
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
  
              // return value.username;
            }
          },
          status: {
            title: 'Status',
            filter: true,
            type: "html",
            valuePrepareFunction: (value,rowData) => {
              if (rowData && rowData.status == 1) {
                return `<span
      style="cursor: pointer;"
      title="Update as Order Packed"
      class="badge badge-primary badge-pill py-2 px-2"
      >Order Packed</span
    >`
              } else if(rowData && rowData.status == 19 || rowData.status == 10) {
                return `    <span
      style="cursor: pointer;"
      title="Order cancel"
      class="badge badge-danger badge-pill py-2 px-2">Order Cancelled by Admin</span>`
              }else if(rowData && rowData.status == 3) {
                return `<span
      style="cursor: pointer;"
      title="Update as Ongoing Order"
      class="badge badge-warning badge-pill py-2 px-2"
      >On Going Order</span
    >`
              }else if(rowData && rowData.status == 6) {
                return ` <span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-success badge-pill py-2 px-2"
      >Delivered</span
    >`
              }else if(rowData && rowData.status == 7) {
                return `<span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-success badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 7"
      >Order Delivered</span
    >`
              }else if(rowData && rowData.status == 8) {
                return ` <span
      style="cursor: pointer;"
      title="Update as Order Delivered"
      class="badge badge-success badge-pill py-2 px-2"
      >Order Delivered</span
    >`
              }else if(rowData && rowData.status == 16) {
                return ` <span
      style="cursor: pointer;"
      title="Update as Order Collected"
      class="badge badge-success badge-pill py-2 px-2"
      >Order Collected</span
    >`
              }else if(rowData && rowData.foods.status == 16) {
                return `    <span
      style="cursor: pointer;"
      title="Update as Order Collected"
      class="badge badge-success badge-pill py-2 px-2"
      >Order Collected</span
    >`
              }else if(rowData && rowData.foods.status == 17) {
                return `<span
      style="cursor: pointer;"
      title="Update as Order refunded"
      class="badge badge-success badge-pill py-2 px-2"
      >Order refunded</span
    >`
              }else if(rowData && rowData.status == 9) {
                return `   <span
      style="cursor: pointer;"
      title="Update as Order refunded"
      class="badge badge-danger badge-pill py-2 px-2"
      *ngIf="rowData && rowData.status == 9"
      (click)="confirmModal.show()"
      >Order Cancelled</span
    >`
              }
            }
          },
  
          // invoice : {
          //   title : 'Invoice',
          //   filter: true,
          //   type: "html",
          //   valuePrepareFunction: (value, row) => {
          //     console.log(row, "11111111111111--------------------")
              
          //     // return "<a (click)='download()'><button (click)='download()'>Download</button></a>"
          //     return `<button class="download-btn" (click)='download()' data-row-id="${row.id}">Download</button>`;
          //     // return (row && row.transactions[0] && row.transactions[0].type != undefined ? row.transactions[0].type : '');
  
          //     // return value.username;
          //   }
  
          // }
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
  
          // cancel: {
          //   title: 'Order cancel',
          //   filter: true,
          //   type: 'custom',
          //   renderComponent: OrderCancelComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.cancelOrder(row._id, row.status,);
          //     });
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
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/orders/usercancelledorders', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    }else{

      this.settings = {
        selectMode: this.delete_btn?'multi':"",
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
            title: 'Order ID',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          user: {
            title: 'Customer ',
            filter: true,
            valuePrepareFunction: (value, row) => {
              console.log(row.user, "row")
              if(row.guestLogin){
                return (row && row.delivery_address && row.delivery_address.first_name ? `${row.delivery_address.first_name} (Guest)` : "username");
              }
              if (row && row.user && row.user.first_name && row.user.first_name != (undefined || null || '')) {
                return (row.user.first_name.charAt(0).toUpperCase() + row.user.first_name.substr(1).toLowerCase()) + " " + (row.user.last_name.charAt(0).toUpperCase() + row.user.last_name.substr(1).toLowerCase());
              } else {
                return (row && row.user && row.user.username ? row.user.username : "username");
              }
  
              // return value.username;
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
  
              // return value.username;
            }
          },
          status: {
            title: 'Delivery Status',
            filter: true,
            type: 'custom',
            renderComponent: OrderManageComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe(row => {
                this.changeStatus(row._id, row.status,row.height,row.breadth,row.length,);
              });
            }
          },
  
          // invoice : {
          //   title : 'Invoice',
          //   filter: true,
          //   type: "html",
          //   valuePrepareFunction: (value, row) => {
          //     console.log(row, "11111111111111--------------------")
              
          //     // return "<a (click)='download()'><button (click)='download()'>Download</button></a>"
          //     return `<button class="download-btn" (click)='download()' data-row-id="${row.id}">Download</button>`;
          //     // return (row && row.transactions[0] && row.transactions[0].type != undefined ? row.transactions[0].type : '');
  
          //     // return value.username;
          //   }
  
          // }
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
  
          // cancel: {
          //   title: 'Order cancel',
          //   filter: true,
          //   type: 'custom',
          //   renderComponent: OrderCancelComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.cancelOrder(row._id, row.status,);
          //     });
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
          custom: [],
        },
      }
      // if (!this.delete_btn) {
      //   const indexColumn = {
      //     index: {
      //       title: 'S No',
      //       type: 'text',
      //       valuePrepareFunction: (value, row, cell) => {
      //         return this.skip + cell.row.index + 1 + '.';
      //       },
      //     },
      //   };
      
      //   // Insert `indexColumn` at the beginning of the `columns`
      //   this.settings.columns = { ...indexColumn, ...this.settings.columns };
      // }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/orders/usercancelledorders', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    }
  };

  changeStatus(id, status,height?,breadth?,length?) {
    if (id && status) {

      this.apiService.CommonApi(Apiconfig.updateOrderStatus.method, Apiconfig.updateOrderStatus.url, { order_id: id, status: 3 }).subscribe(result => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message || 'Updated Successfully');
          if(status === 1){
            this.apiService.CommonApi(Apiconfig.ShipRocket.method, Apiconfig.ShipRocket.url, {order_id: id,height:height,breadth:breadth,length:length}).subscribe(result => {
              console.log(result, "result111111111111111111111111111111111111");
               if(result.error){
                this.notifyService.showError(result.message || 'Something went wrong');
               }
            })
          }
          this.ngOnInit();
        } else {
          this.notifyService.showError(result.message || 'Something went wrong');
        }
      })
    } else {
      this.notifyService.showError('Order object id or status is required')
    }
  }
  download(){
    console.log("HIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII");
    
  }

  cancelOrder(id, status) {
    if (id && status) {
      this.apiService.CommonApi(Apiconfig.cancelOrderstatus.method, Apiconfig.cancelOrderstatus.url, { order_id: id, status: 19 }).subscribe((res) => {
        if (res && res.status === true) {
          this.ngOnInit()
        } else {
          this.notifyService.showError(res.message || "Somthing went wrong")
        }
      })

    }
  }






}
