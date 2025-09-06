import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  selector: 'app-reported-list',
  templateUrl: './reported-list.component.html',
  styleUrls: ['./reported-list.component.scss']
})
export class ReportedListComponent implements OnInit {

  settings: any;
  source: LocalDataSource = new LocalDataSource();
  bulk_action: boolean = true;
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  add_btn: boolean = false;
  delete_btn = true;
  addBtnUrl: string = '/app/report/report-add';
  addBtnName: string = '';
  editUrl: string = '/app/report/report-edit/';
  viewUrl: string = '/app/report/report-edit/';
  deleteApis: apis = Apiconfig.reportTempletDelete;
  inactiveApis: apis = Apiconfig.reportTemplateInactive;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  user_list_filter_action:boolean=true;
  

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
      if (this.router.url == '/app/report/reported-list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'report');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
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
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search
    };
    this.getDataList(data);
  }

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.reportedList.method, Apiconfig.reportedList.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.source.load(result.data.userData);
          this.count = result.data.count;
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
          from_name: {
            title: 'Reporter Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          from_email: {
            title: 'Reporter Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          report_name: {
            title: 'Report Title',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          to_name: {
            title: 'Complainant Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          to_email: {
            title: 'Complainant Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          type: {
            title: 'User',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          }
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
          position: 'right',
          // custom: [],
        },
      }
      // this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/report/reported-list', this.userPrivilegeDetails, this.delete_btn, false, true);
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
          from_name: {
            title: 'Reporter Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          from_email: {
            title: 'Reporter Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          report_name: {
            title: 'Report Title',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          to_name: {
            title: 'Complainant Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          to_email: {
            title: 'Complainant Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          type: {
            title: 'User',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          }
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
          position: 'right',
          // custom: [],
        },
      }
      // this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/report/reported-list', this.userPrivilegeDetails, false, false, true);
    };
  };
}
