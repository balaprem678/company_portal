import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PopupComponent } from 'src/app/shared/popup.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mobile-list-banner',
  templateUrl: './mobile-list-banner.component.html',
  styleUrls: ['./mobile-list-banner.component.scss']
})
export class MobileListBannerComponent implements OnInit {
  status: any
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
  add_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = false;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/banners/web-add';
  addBtnName: string = 'Add Banner';
  editUrl: string = 'app/banners/web-edit/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  deleteApis: apis = Apiconfig.banner_webDelete;
  archivedDetails: boolean = false;
  restoreApis: apis = Apiconfig.banner_webRestore;
  permanentdelete: apis = Apiconfig.bannerPermanentDele;
  constructor(private router: Router, private authService: AuthenticationService,
    private apiService: ApiService,
    private sanitized: DomSanitizer,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/banners/web-list' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Banners');
        console.log(this.userPrivilegeDetails);

        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete && this.delete_btn) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit && this.edit_btn) {
          this.edit_btn = true;
        } else {
          this.edit_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.view && this.view_btn) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.add && this.add_btn) {
          this.add_btn = true;
        } else {
          this.add_btn = false;
        }
      }
    }
    this.loadsettings('')
  }

  ngOnInit(): void {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status
    }
    // console.log("datadatadatadatadatadatadatadatadatadatadatadata", data)
    if (!this.totalItems || typeof this.totalItems == undefined) {
      this.getUsers(data)
    }
    this.getUsers(data)
  }


  getUsers(getusers) {
    // console.log(getusers, 'this is data');

    this.apiService.CommonApi(Apiconfig.listBanners.method, Apiconfig.listBanners.url, getusers).subscribe(response => {
      console.log(response, 'this is response****');
      if (response && response.length > 0 && response[0] != 0) {
        this.getlistusers = response[0];
        this.totalItems = response[1];
        this.getlistdata = response[2];

        this.loadsettings('')
        getusers.status = 0
        this.apiService.CommonApi(Apiconfig.banner_web_archieve.method, Apiconfig.banner_web_archieve.url, getusers).subscribe(result => {
          console.log(result, 'what is the result');

          this.loadCard_Details(response[2][0]?.all[0]?.count || 0, response[2][0].active[0]?.count || 0, response[2][0].inactive[0] ? response[2][0].inactive[0].count : 0, result[1] ? result[1] : 0);
          if (!this.archivedDetails) {
            this.source.load(this.getlistusers);
            console.log("ghtygfjsdtgfsdf at line 123")

          } else {
            console.log("ghtygfjsdtgfsdf at line 124", result[0])
            this.loadsettings('archive')
            this.source.load(result[0]);
            this.totalItems = result[1];
            this.archivedDetails = false;
          }
        })
      }
      else {
        this.getlistusers = []
        console.log("comming here9999999999999999999999999999999999999999999999999999999999999999")
        this.source.load([]);
        this.apiService.CommonApi(Apiconfig.banner_web_archieve.method, Apiconfig.banner_web_archieve.url, getusers).subscribe(result => {
          console.log(result, 'what is the result');

          this.loadCard_Details(response[2][0]?.all[0]?.count || 0, response[2][0]?.active[0]?.count || 0, response[2][0]?.inactive[0] ? response[2][0].inactive[0]?.count : 0, result[1] ? result[1] : 0);
          if (!this.archivedDetails) {
            this.source.load(this.getlistusers);
          } else {
            this.loadsettings('archive')
            this.source.load(result[0]);
            this.totalItems = result[1];
            this.archivedDetails = false;
          }
        })
      }
    })
  }


  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.skip = 0
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event,
      'status': this.status
    }
    if (event.length == 0) {
      data.skip = 0
      this.getUsers(data);
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
    this.getUsers(data);
  };

  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'search': this.global_search,
      'status': this.status
    };
    this.getUsers(data);
  }


  loadCard_Details(allUsers, activeUsers, inactiveUsers, archieveList) {
    this.card_details = [
      {
        title: 'All Web Banners',
        value: allUsers,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'Active Web Banners',
        value: activeUsers,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
      },
      {
        title: 'Inactive Web Banners',
        value: inactiveUsers,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive'
      },
      {
        title: "Deleted Web Banners",
        value: archieveList,
        bg_color: 'clr-red',
        icon: 'fa fa-user-circle-o',
        click_val: 'archieve'
      },

      // {
      //   title: "TODAY'S USERS",
      //   value: todayUsers,
      //   bg_color: 'delete-user',
      //   icon: 'fa fa-user-circle-o',
      //   click_val: 'today'
      // },
    ];
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
    } else if (event == 'archieve') {

      data.status = 0;
      this.global_status = 0;
      this.archivedDetails = true;
    }
    // this.loadsettings(event);
    console.log(data, 'uauauauauau');

    this.getUsers(data);
  }

  onDeleteChange(event) {
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search
    }
    // this.ngOnInit();

    this.getUsers(data);
  };
  changefeatured(id, status) {
    var data = {
      db: "webbanners",
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

  loadsettings(event) {
    if (event == 'archive') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          bannername: {
            title: 'Banner names',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          category: {
            title: 'Categories',
            filter: true,
            valuePrepareFunction: (category, row) => {

              console.log("ghtygfjsdtgfsdf", category, row)
              return category;
            }
          },
          img: {
            title: 'Images',
            filter: true,
            type: "html",
            valuePrepareFunction: image => {
              return '<img src="' + environment.apiUrl + image + '" width="32" height="32">';
            }
          },
          status: {
            title: 'Status',
            filter: false,
            valuePrepareFunction: image => {
              return 'Deleted';
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
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/banners/web-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          img: {
            title: 'Image ',
            filter: true,
            type: "html",
            valuePrepareFunction: image => {
              return '<img src="' + environment.apiUrl + image + '" width="32" height="32">';
            }
          },
          bannername: {
            title: 'Banner name',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
         
          category: {
            title: 'Category',
            filter: true,
            valuePrepareFunction: category => {
              return category;
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
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/banners/web-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);

    }
  }
}
