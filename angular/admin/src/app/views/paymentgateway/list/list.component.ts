import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PopupComponent } from 'src/app/shared/popup.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {

  settings: any;
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
  view_btn: boolean = true;
  bulk_action: boolean = false;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/paymentgateway/add';
  addBtnName: string = 'Add';
  editUrl: string = '/app/paymentgateway/edit/';
  viewUrl: string = '/app/paymentgateway/view/';
  deleteApis: apis = Apiconfig.paymentgatewayDelete;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
  ) {
    this.curentUser = this.authService.currentUserValue;

    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/paymentgateway/list' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Payment Gateway');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        // if (this.userPrivilegeDetails[0].status.delete) {
        //   this.delete_btn = true;
        // } else {
        //   this.delete_btn = false;
        //   this.bulk_action = false;
        // }
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
        // if (this.userPrivilegeDetails[0].status.add) {
        //   this.add_btn = true;
        // } else {
        //   this.add_btn = false;
        // }

      }
    }
    this.loadsettings('');
  }

  ngOnInit(): void {
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search
    };
    this.getDataList(data);
  }

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.paymentgatewayList.method, Apiconfig.paymentgatewayList.url, data).subscribe(
      (result) => {
        this.source.load(result[0]);
        this.count = result[1];
        this.cd.detectChanges();
      }
    )
  };

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
      'search': event
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
      'search': this.global_search
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
      'search': this.global_search
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
          gateway_name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: (value,row) => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
              
              
            }
          },
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/paymentgateway/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
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
          name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction:( value,row) => {
             return row.settings.name.charAt(0).toUpperCase() + row.settings.name.substr(1).toLowerCase();
            }
          },
          status: {},
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
      if(this.edit_btn){
        this.settings.columns.status={
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
        }
      }else{
        this.settings.columns.status= {
          title: 'Status',
          filter: true,
          type:'html',
          valuePrepareFunction:( value,rowData) => {
           if(rowData && rowData.status == 1){
            return `<span style="cursor: pointer;" class='badge badge-success badge-pill mb-1' >Active</span>`
           }else if(rowData && rowData.status == 2){
            return `<span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1' >Inactive</span>`
           }
          }
        }
      }

      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/paymentgateway/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };
  changefeatured(id, status) {
    var data = {
      db: "paymentgateway",
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
}
