import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-taxlist',
  templateUrl: './taxlist.component.html',
  styleUrls: ['./taxlist.component.scss']
})
export class TaxlistComponent implements OnInit {
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
  addBtnUrl: string = '/app/taxmanagement/add';
  addBtnName: string = 'Add';
  editUrl: string = '/app/taxmanagement/edit/';
  viewUrl: string = '/app/taxmanagement/view/';
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
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/taxmanagement/list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'taxmanagement');
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
    this.apiService.CommonApi(Apiconfig.taxlist.method, Apiconfig.taxlist.url, data).subscribe(
      (result) => {

        this.source.load(result[0]);
        this.count = result[1];
        this.cd.detectChanges();
      }
    )
  };
  onDeleteChange(event) {
    if (event && event.nModified > 0) {
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


  loadsettings(event) {

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
        country: {
          title: 'Country',
          filter: true,
          valuePrepareFunction: row => {
            return row.name;
          }
        },
        tax_type: {
          title: 'Tax Type',
          filter: true,
          valuePrepareFunction: value => {
            return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
          }
        },
        state_name: {
          title: 'State',
          filter: true,
          valuePrepareFunction: value => {
            return value ? value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() : '';
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
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/taxmanagement/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  }

}
