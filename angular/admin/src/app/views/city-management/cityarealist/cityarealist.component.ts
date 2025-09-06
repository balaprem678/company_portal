import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cityarealist',
  templateUrl: './cityarealist.component.html',
  styleUrls: ['./cityarealist.component.scss']
})
export class CityarealistComponent implements OnInit {
  status: 0;
  cityarealist: any;
  getcardsdata: any;
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
  edit_btn: boolean = true;
  view_btn: boolean = false;
  delete_btn: boolean = false;
  editUrl: string = '/app/cityManagement/editCity_area/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  id: string = '';
  constructor(
    private router: Router, 
    private authService: AuthenticationService,
    private apiService: ApiService, 
    private sanitized: DomSanitizer, 
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute 
  ) {
    this.loader.loadingSpinner.next(true);
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/category/category-list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'users');
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
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.add) {
          this.add_btn = true;
        } else {
          this.add_btn = false;
        }
      }
    }
    this.loadsettings('');
    this.id = this.route.snapshot.paramMap.get('id');
   }

   ngOnInit(): void {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status
    }
    this.getdata(data)
  }

  getdata(data) {
    data.id = this.id;
    this.apiService.CommonApi(Apiconfig.cityarealist.method, Apiconfig.cityarealist.url, data).subscribe(response => {
      if (response && response.length > 0) {
        this.cityarealist = response[0];
        this.count = response[1];
        this.getcardsdata = response[2];
        this.source.load(this.cityarealist);
        this.cd.detectChanges();
      }
    })
  }

  onDeleteChange(event) {
    this.ngOnInit();
  };

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event
    }
    this.getdata(data);
  };

  onitemsPerPageChange(event) {
    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': this.global_search
    }
    this.getdata(data);
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'search': this.global_search
    };
    this.getdata(data);
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
    this.getdata(data);
  }

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'single',
        hideSubHeader: true,
        columns: {
          area_name: {
            title: 'Area',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          status: {
            title: 'Status',
            filter: false,
            type: 'html',
            valuePrepareFunction: value => {
              return `<span style="cursor: pointer;" class='badge badge-success badge-pill mb-1' *ngIf="value == 1" (click)="confirmModal.show()" >Active</span><span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1'  *ngIf="value != 1">InActive</span>`;
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
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/category/sub-category-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: 'single',
        hideSubHeader: true,
        columns: {
          area_name: {
            title: 'Area',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          status: {
            title: 'Status',
            filter: false,
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" :`<span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1'>InActive</span>`;
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
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/category/sub-category-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };
 

}
