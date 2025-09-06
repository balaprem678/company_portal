import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cancelorders',
  templateUrl: './cancelorders.component.html',
  styleUrls: ['./cancelorders.component.scss']
})
export class CancelordersComponent implements OnInit {
  status: any = 10;
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
  bulk_action: boolean = true;
  dataid: any;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;
  canceluser: any;
  export_btn: boolean = true;


  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService, private sanitized: DomSanitizer, private getSettings: TableSettingsService, private notifyService: NotificationService,
    private store: DefaultStoreService) {
      this.curentUser = this.authService.currentUserValue;
      if (this.curentUser && this.curentUser.doc.role == "subadmin") {
        if (this.router.url == '/app/orders/cancelorders' && this.curentUser.doc.privileges) {
          this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Orders');
          // if (!this.userPrivilegeDetails[0].status.view) {
          //   this.notifyService.showWarning('You are not authorized this module');
          //   this.router.navigate(['/app']);
          // };
          // if (this.userPrivilegeDetails[0].status.delete) {
          //   this.cancelTheOrder = true;
          // } else {
          //   this.cancelTheOrder = false;
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
          // if (this.userPrivilegeDetails[0].status.edit) {
          //   this.updateTheOrders = true;
          // } else {
          //   this.updateTheOrders = false;
          // }
       
        }
      }
    this.filter_action_list = [
      {
        name: 'Order Id',
        tag: 'input',
        type: '',
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
  }

  onSubmit(data) {
    data = this.dataid;
    this.apiService.CommonApi(Apiconfig.getorderdata.method, Apiconfig.getorderdata.url, { id: data }).subscribe(result => {
      if (result) {
        this.notifyService.showSuccess("Get Your Status")
      }
    }, (error) => {
      console.log(error)
      this.notifyService.showError(error)
    })
  }

  onFilterAction(event) {
    console.log(event);
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status
    } as any
    if (event.Order_Id) {
      data.search = event.Order_Id

    }
    this.getUsers(data)
    // this.source = new LocalDataSource();
    // // if (event && event.id != '') {
    //   this.global_filter_action.id = event.id;
    //   this.apiService.CommonApi(Apiconfig.admincancelorders.method, Apiconfig.admincancelorders.url, { id: event.id }).subscribe(result => {
    //     this.canceluser = result;
    //     if (result) {
    //       this.notifyService.showSuccess("Get Your Status")
    //     }
    //   }, (error) => {
    //     this.notifyService.showError(error)
    //   })
    // } else {
    //   delete this.global_filter_action.id;
    // }
  }

  getUsers(getusers) {
    this.apiService.CommonApi(Apiconfig.admincancelorders.method, Apiconfig.admincancelorders.url, getusers).subscribe(response => {
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];
        console.log("sdfsd", this.getlistusers)
        this.source.load(this.getlistusers);
      }
      else {
        this.getlistusers = []
      }
      console.log("sfs", response)
    })
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
      'search': this.global_search,
      'status': this.status
    }
    this.apiService.CommonApi(Apiconfig.seenstatus.method, Apiconfig.seenstatus.url, data)
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
            console.log("row", row)
            // return (row.user[0].first_name.charAt(0).toUpperCase() + row.user[0].first_name.substr(1).toLowerCase()) + " " + (row.user[0].last_name.charAt(0).toUpperCase() + row.user[0].last_name.substr(1).toLowerCase());
            // return ( row && row.user && row.user.username ? row.user.username : "username");
            // return row.user[0].username;
            
            if(row && row.user[0] && row.user[0].first_name && row.user[0].first_name != (undefined || null || '')){
              return (row.user[0].first_name.charAt(0).toUpperCase() + row.user[0].first_name.substr(1).toLowerCase()) + " " + (row.user[0].last_name.charAt(0).toUpperCase() + row.user[0].last_name.substr(1).toLowerCase());
            }else{
              return ( row && row.user[0] && row.user[0].username ? row.user[0].username :row.delivery_address.first_name);
            }
          }
        },
        status: {
          title: 'Status',
          filter: true,
          type: "html",
          valuePrepareFunction: (value, row) => {
            // if (row.user[0].status && row.user[0].status == 1) {
            //   return `<div title="Seen" ><p>Cancelled By You</p> </div>`
            // }else{
            //   return `<div title="Seen" ><p>Cancelled By You</p> </div>`
            // }
            return `<div title="Seen" ><p>Cancelled By You</p> </div>`

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
