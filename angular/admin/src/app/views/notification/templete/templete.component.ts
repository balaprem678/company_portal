import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-templete',
  templateUrl: './templete.component.html',
  styleUrls: ['./templete.component.scss']
})
export class TempleteComponent implements OnInit {

  settings: any;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  add_btn: boolean = true;
  delete_btn = true;
  addBtnUrl: string = '/app/notification/templete-add';
  addBtnName: string = 'Add Templates';
  editUrl: string = '/app/notification/templete-edit/';
  deleteApis: apis = Apiconfig.deletenotification;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  template: boolean = true;
  data: { skip: number; limit: number; search: string; };

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private notifyService: NotificationService,
    private getSettings: TableSettingsService,
    private route: ActivatedRoute
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    console.log(this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/notification/templete' || (split.length > 0 && split[2] == 'notification')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'notification');
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
    this.data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'search': this.global_search
    };
    this.getDataList(this.data);
    this.apiService.CommonApi(Apiconfig.getmessagetemplate.method, Apiconfig.getmessagetemplate.url, {}).subscribe(result => {
    })
    this.apiService.CommonApi(Apiconfig.getmailemplate.method, Apiconfig.getmailemplate.url, {}).subscribe(result => {
    })
  };

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.notificationTemplate.method, Apiconfig.notificationTemplate.url, data).subscribe(
      (result) => {
        if (result) {
          console.log("safddasd", result)
          // for (let i = 0; i < result.length; i++) {
          //   console.log('sdfsd', result[i].notificationtype)
          //   result[i].notificationtype = (result[i].notificationtype ? (((result[i].notificationtype == 'Email') || (result[i].notificationtype == 'email') ? "Email" : '') || ((result[i].notificationtype == 'Message') || (result[i].notificationtype == 'message') ? "Message" : '')) : '');
          // }
          console.log("asdada", this.source.load(result[0]))
          //this.count = result.data.count;
          this.cd.detectChanges();
        }
      }
    )
  }

  onDeleteChange() {
    this.ngOnInit();
    window.location.reload();
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

  defaultlang(id) {
    this.apiService.CommonApi(Apiconfig.languageDefault.method, Apiconfig.languageDefault.url, { id: id }).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message);
          this.ngOnInit();
        } else {
          this.notifyService.showError(result.message);
        }
      }
    )
  }

  loadsettings(event) {
    console.log(event);

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
          name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          notificationtype: {
            title: 'Type',
            filter: true,
            valuePrepareFunction: value => {
              return value;
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/notification/templete', this.userPrivilegeDetails, true, true, false);
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
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          notificationtype: {
            title: 'Type',
            filter: true,
            valuePrepareFunction: value => {
              return value;
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/notification/templete', this.userPrivilegeDetails, true, true, false);
    };
  };
}