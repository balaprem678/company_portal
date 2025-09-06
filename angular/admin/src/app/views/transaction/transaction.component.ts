import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';

@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.scss']
})
export class TransactionComponent implements OnInit {


  settings: any;
  source: LocalDataSource = new LocalDataSource();
  userPrivilegeDetails: PrivilagesData[];
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  // userPrivilegeDetails: any;
  viewUrl: string = '/app/users/view/';
  global_status: number = 0;
  global_search: string;
  currency_code: string = '$ ';
  card_details: any[] = [];
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  filter_transaction_list: boolean = true;
  global_filter_action: any;
  currency_symbol:any;

  constructor(
    private apiService: ApiService,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private store: DefaultStoreService

  ) {
    this.curentUser = this.authService.currentUserValue;
    this.loadsettings('');
    // this.currency_code = this.store.generalSettings
    
    this.filter_action_list = [
      {
        name: 'Plan Name',
        tag: 'select',
        type: '',
      },
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
  }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(
      (result1)=>{        
        this.currency_symbol=result1.data.currency_symbol;
        var data = {
          'skip': this.skip,
          'limit': this.default_limit,
          'status': this.global_status,
          'search': this.global_search,
          'filter_action': this.global_filter_action,
        };
        this.getDataList(data);
      }
    )
    
  };

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.transactionList.method, Apiconfig.transactionList.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
         
          
          this.loadCard_Details( result.data.totalAmount ?  this.currency_symbol + result.data.totalAmount.toFixed(2): 0 )
          this.source.load(result.data.userData);
          this.count = result.data.count;
          this.cd.detectChanges();
        }
      }
    )
  };
  onFilterAction(event) {
    this.source = new LocalDataSource();
    if (event && event != '') {
      this.global_filter_action = event;
    } else {
      this.global_filter_action = {};
    }
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,
    };
    this.getDataList(data);
  }
 
  onDeleteChange(event) {
    if (event && event.status == 1) {
      this.skip = 0;
      this.ngOnInit();
    }
  };

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': event,
      'filter_action': this.global_filter_action,

    }
    this.getDataList(data);
  };

  onitemsPerPageChange(event) {
    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,

    }
    this.getDataList(data);
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,

    };
    this.getDataList(data);
  }

  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,

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
    } else if (event == 'delete') {
      data.status = 4;
      this.global_status = 4;
    } else if (event == 'today') {
      data.status = 5;
      this.global_status = 5;
    }
    this.loadsettings(event);
    this.getDataList(data);
  }
  loadCard_Details(totalamount) {    
    this.card_details = [
      {
        title: 'TOTAL AMOUNT',
        value: totalamount  || 0,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },]
  }
  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        // selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          index: {
            title: 'S No',
            type: 'text',
            valuePrepareFunction: (value, row, cell) => {
              return cell.row.index + 1 + '.';
            }
          },
          plan_name: {
            title: 'Plan Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          username: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          createdAt: {
            title: 'Published On',
            filter: true,
            valuePrepareFunction: date => {
              if (date) {
                return new DatePipe('en-US').transform(date, 'dd-MMM-yyyy');
              } else {
                return null;
              }
            }
          },
          // type: {
          //   title: 'Pay By',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
          //   }
          // }, 
           plan_type: {
            title: 'Status',
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>New</span>" : "<span class='badge badge-pill badge-danger mb-1'>Upgrade</span>";
            }
          },
          amount: {
            title: 'Amount',
            filter: true,
            valuePrepareFunction: value => {
              return this.currency_code + value;
            }
          },
          trans_status: {
            title: 'Status',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              if (value == 'succeeded') {
                return "<span class='badge badge-success badge-pill mb-1'>" + value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() + "</span>";
              } else {
                return "<span class='badge badge-danger badge-pill mb-1'>" + value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() + "</span>";
              }
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
          // columnTitle: 'Actions',
          // class: 'action-column',
          // position: 'right',
          // custom: [],
        },
      }
      // this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/transaction', this.userPrivilegeDetails, false, false, false);
    } else {
      this.settings = {
        // selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          index: {
            title: 'S No',
            type: 'text',
            valuePrepareFunction: (value, row, cell) => {
              return cell.row.index + 1 + '.';
            }
          },
          plan_name: {
            title: 'Plan Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          username: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          createdAt: {
            title: 'Published On',
            filter: true,
            valuePrepareFunction: date => {
              if (date) {
                return new DatePipe('en-US').transform(date, 'dd-MMM-yyyy');
              } else {
                return null;
              }
            }
          },
          // type: {
          //   title: 'Pay By',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
          //   }
          // },
          plan_type: {
            title: 'Plan Type',
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-info badge-pill mb-1'>New</span>" : "<span class='badge badge-pill  badge-dark mb-1'>Upgrade</span>";
            }
          },
          amount: {
            title: 'Amount',
            filter: true,
            valuePrepareFunction: value => {
              return this.currency_code + value;
            }
          },
          trans_status: {
            title: 'Status',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              if (value == 'succeeded') {
                return "<span class='badge badge-success badge-pill mb-1'>" + value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() + "</span>";
              } else {
                return "<span class='badge badge-danger badge-pill mb-1'>" + value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() + "</span>";
              }
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
          // columnTitle: 'Actions',
          // class: 'action-column',
          // position: 'right',
          // custom: [],
        },
      }
      // this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/transaction', this.userPrivilegeDetails, false, false, false);
    };
  };
   ngAfterViewInit(): void {
    var data = {
      'skip': 0,
      'limit': 50,
      'status': 0,
    }
    this.apiService.CommonApi(Apiconfig.subscriptionList.method, Apiconfig.subscriptionList.url, data).subscribe(
      (result) => {        
        if (result && result.status == 1) {
         // this.store.Transaction_PlanName.next(result.data.userData ? result.data.userData : []);
        }
      }
    );
  }

}

