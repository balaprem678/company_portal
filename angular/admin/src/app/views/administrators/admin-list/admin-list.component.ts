import { DatePipe } from '@angular/common';
// import { NullTemplateVisitor } from '@angular/compiler';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-admin-list',
  templateUrl: './admin-list.component.html',
  styleUrls: ['./admin-list.component.scss']
})
export class AdminListComponent implements OnInit {
  // pageTitle: string = 'Admin Detail';

  settings: any;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: PrivilagesData[] = [];
  add_btn: boolean = false;
  edit_btn: boolean = true;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/administrator/admin-add';
  addBtnName: string = 'Admin Add';
  editUrl: string = '/app/administrator/admin-edit/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  supportData: any = {
    username: null,
    emai: null,
    name: null,
    createdAt: '',
    activity: {
      last_login: ''
    }
  }
  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/administrator/list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'administrator');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.add) {
          this.add_btn = false;
        } else {
          this.add_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit) {
          this.edit_btn = true;
        } else {
          this.edit_btn = true;
        }
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
      }
    }
    this.loadsettings('');
  }

  ngOnInit(): void {
    var data = {
      'role': 'admin',
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search
    };
    this.getDataList(data);
  };

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.adminList.method, Apiconfig.adminList.url, data).subscribe(
      (result) => {
        if (result && result.length > 0) {
          this.supportData = result[0]
          this.source.load(result[0]);
          this.count = result[1];
          this.cd.detectChanges();
        }
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
      'role': 'admin',
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
      'role': 'admin',
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
      'role': 'admin',
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
      'role': 'admin',
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
          username: {
            title: 'Admin Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          email: {
            title: 'Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          activity: {
            title: 'Last Login Date',
            filter: true,
            valuePrepareFunction: value => {
              if (value) {
                var date = value.last_login ? value.last_login : new Date();
                return date ? new DatePipe('en-US').transform(date, 'MMMM dd,yyyy hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy');
                return date;
              } else {
                return null;
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
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/administrator/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, false);
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
          username: {
            title: 'Admin Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          email: {
            title: 'Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          activity: {
            title: 'Last Login Date',
            filter: true,
            valuePrepareFunction: value => {
              if (value) {
                var date = value.last_login ? value.last_login : new Date();
                console.log(date);
                
                return date ?  new DatePipe('en-US').transform(date, 'MMMM dd,yyyy hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy');
              } else {
                return null;
              }
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/administrator/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, false);
    };
  };
  // editAdmin(){
  //   this.router.navigate(['/app/administrator/admin-edit',]);


  // }

}
