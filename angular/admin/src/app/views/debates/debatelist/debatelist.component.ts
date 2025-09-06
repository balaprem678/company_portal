import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { apis } from 'src/app/interface/interface';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
@Component({
  selector: 'app-debatelist',
  templateUrl: './debatelist.component.html',
  styleUrls: ['./debatelist.component.scss']
})
export class DebatelistComponent implements OnInit, AfterViewInit {

  settings: any;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  bulk_action: boolean = true;
  add_btn: boolean = false;
  edit_btn: boolean = false;
  view_btn: boolean = true;
  export_btn: boolean = false;
  delete_btn: boolean = true;
  viewUrl: string = '/app/debate/view/';
  deleteApis: apis = Apiconfig.debateDelete;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  user_id: string;
  filter_action: boolean = true;
  user_based_name: string = '';
  filter_action_list: any[] = [];
  cardActive: string;
  global_filter: string;
  global_filter_action = {} as any;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private socketService: WebSocketService,
    private notifyService: NotificationService,
    private ActivatedRoute: ActivatedRoute,
    private store: DefaultStoreService
  ) {
    this.user_id = this.ActivatedRoute.snapshot.paramMap.get('user_id');
    this.loader.loadingSpinner.next(true);
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/debate/list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'debate');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
      };
    }
    if (this.user_id) {
      this.apiService.CommonApi(Apiconfig.userEdit.method, Apiconfig.userEdit.url + this.user_id, {}).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.user_based_name = result.data.first_name ? (result.data.first_name + ' ' + (result.data.last_name ? result.data.last_name : '')) : '';
          }
        });
    }
    this.filter_action_list = [
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
      {
        name: 'Category',
        tag: 'select',
        type: '',
      },
      {
        name: 'Duration',
        tag: 'select',
        type: '',
      },
      {
        name: 'Feed',
        tag: 'select',
        type: ''
      }
    ]
    this.loadsettings('');
    this.socketService.listen('admin_new_debate').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          this.notifyService.showInfo(data.message);
          this.skip = 0;
          this.ngOnInit();
        }
      }
    });
    this.socketService.listen('admin_debate_delete').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          this.notifyService.showInfo(data.message);
          this.skip = 0;
          this.ngOnInit();
        }
      }
    });
    this.ActivatedRoute.queryParams.subscribe(params => {
      if (params && params['selected'] == 'feed') {
        this.global_status = 5;
        this.cardActive = 'feed';
      } else if (params['selected'] == 'upcoming') {
        this.global_status = 3;
        this.cardActive = 'upcoming';
      } else if (params['selected'] == 'top3') {
        this.global_filter = params['selected'];
      }
    });
  }

  ngOnInit(): void {

    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    };
    this.getUserList(data);
  };

  getUserList(data) {
    if (this.user_id && typeof this.user_id != 'undefined' && this.user_id != '') {
      data['user_id'] = this.user_id;
    }
    this.apiService.CommonApi(Apiconfig.debateList.method, Apiconfig.debateList.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.loadCard_Details(result.data.allDebate || 0, result.data.feed || 0, result.data.upcommingDebate || 0, result.data.previousDebate || 0, result.data.expired || 0);
          this.source.load(result.data.userData);
          this.count = result.data.count;
          setTimeout(() => {
            // this.loader.loadingSpinner.next(false);
          }, 1000);
          this.cd.detectChanges();
        }
      }
    )
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
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    }
    this.getUserList(data);
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
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    }
    this.getUserList(data);
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    };
    this.getUserList(data);
  }

  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    }
    if (event == 'all') {
      data.status = 0;
      this.global_status = 0;
    } else if (event == 'live') {
      data.status = 1;
      this.global_status = 1;
    } else if (event == 'feed') {
      data.status = 5;
      this.global_status = 5;
    } else if (event == 'today') {
      data.status = 2;
      this.global_status = 2;
    } else if (event == 'upcoming') {
      data.status = 3;
      this.global_status = 3;
    } else if (event == 'previous') {
      data.status = 4;
      this.global_status = 4;
    } else if (event == 'expired') {
      data.status = 6;
      this.global_status = 6;
    }
    this.loadsettings(event);
    this.getUserList(data);
  }

  loadCard_Details(allDebate, feed, upcommingDebate, previousDebate, expired) {
    this.card_details = [
      {
        title: 'ALL DEBATES',
        value: allDebate,
        bg_color: 'clr-green',
        // icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'FEEDS',
        value: feed,
        bg_color: 'clr-ancblue',
        // icon: 'fa fa-user-plus',
        click_val: 'feed'
      },
      // {
      //   title: "TODAY'S DEBATES",
      //   value: todayDebate,
      //   bg_color: 'inactive-user',
      //   icon: 'fa fa-user-times',
      //   click_val: 'today'
      // },
      {
        title: 'UPCOMING DEBATES',
        value: upcommingDebate,
        bg_color: 'clr-pink',
        // icon: 'fa fa-line-chart',
        click_val: 'upcoming'
      },
      {
        title: "PREVIOUS DEBATES",
        value: previousDebate,
        bg_color: 'clr-blue',
        // icon: 'fa fa-backward',
        click_val: 'previous'
      },
      {
        title: "EXPIRED DEBATES",
        value: expired,
        bg_color: 'clr-red',
        // icon: 'fa fa-exclamation-circle',
        click_val: 'expired'
      },
    ];
  }

  loadsettings(event) {
    if (typeof this.user_id == 'undefined' || this.user_id == '' || this.user_id == null) {
      if (event == 'delete') {
        this.settings = {
          selectMode: 'multi',
          hideSubHeader: true,
          columns: {
            topic: {
              title: 'Topic',
              filter: true,
              valuePrepareFunction: value => {
                return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
              }
            },
            category_name: {
              title: 'Category Name',
              filter: true,
              valuePrepareFunction: value => {
                return value ? value : '-';
              }
            },
            user_name: {
              title: 'Created By',
              filter: false,
              type: 'html',
              valuePrepareFunction: (value, row) => {
                //value ? value : '-';
                return `<a target="_blank" class="overflow-text" href="/app/users/view/${row.user_id}" >${value ? value : '-'}</a>`
              }
            },
            start_date: {
              title: 'Start Date',
              filter: true,
              valuePrepareFunction: value => {
                if (value) {
                  return new DatePipe('en-US').transform(value, 'dd-MMM-yyyy');
                } else {
                  return null;
                }
              }
            },
            start_time: {
              title: 'Start Time',
              filter: true,
              valuePrepareFunction: value => {
                if (value) {
                  return new DatePipe('en-US').transform(value, 'hh:mm a');
                } else {
                  return null;
                }
              }
            },
            duration: {
              title: 'Duration',
              filter: true,
              valuePrepareFunction: value => {
                return value + ' Mins'
              }
            },
            post_type: {
              title: 'Debate/Post',
              type: 'html',
              valuePrepareFunction: value => {
                if (value == 1) {
                  return "<span class='badge badge-success badge-pill mb-1'>Post</span>";
                } else if (value == 0) {
                  return "<span class='badge badge-info badge-pill mb-1'>Debate</span>";
                }
              }
            },
            like_count: {
              title: 'Interacts',
              type: 'html',
              valuePrepareFunction: (value, row) => {
                return `<div class="view-list"><i class="fa fa-heart-o" aria-hidden="true"><span>${this.convert(value)}</span></i> ` + `<i class="fa fa-comments-o" aria-hidden="true"><span>${this.convert(row.comment_count)}</span></i> ` + `<i class="fa fa-eye" aria-hidden="true"><span>${this.convert(row.view_count)}</span></i></div>`
              }
            },
            // status: {
            //   title: 'Status',
            //   filter: true,
            //   type: 'html',
            //   valuePrepareFunction: value => {
            //     if (value == 1) {
            //       return "<span class='badge badge-success badge-pill mb-1'>Active</span>";
            //     } else if (value == 0) {
            //       return "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
            //     } else if (value == 2) {
            //       return "<span class='badge badge-pill badge-danger mb-1'>Delete</span>";
            //     }
            //   }
            // }
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
        // this.delete_btn=false
        this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/debate/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
      } else {
        this.settings = {
          selectMode: 'multi',
          hideSubHeader: true,
          columns: {
            topic: {
              title: 'Topic',
              filter: true,
              valuePrepareFunction: value => {
                return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
              }
            },
            category_name: {
              title: 'Category Name',
              filter: true,
              valuePrepareFunction: value => {
                return value ? value : '-';
              }
            },
            user_name: {
              title: 'Created By',
              filter: false,
              type: 'html',
              valuePrepareFunction: (value, row) => {
                //value ? value : '-';
                return `<a target="_blank" class="overflow-text" href="/app/users/view/${row.user_id}" >${value ? value : '-'}</a>`
              }
            },
            start_date: {
              title: 'Start Date',
              filter: true,
              valuePrepareFunction: value => {
                if (value) {
                  return new DatePipe('en-US').transform(value, 'dd-MMM-yyyy');
                } else {
                  return null;
                }
              }
            },
            start_time: {
              title: 'Start Time',
              filter: true,
              valuePrepareFunction: value => {
                if (value) {
                  return new DatePipe('en-US').transform(value, 'hh:mm a');
                } else {
                  return null;
                }
              }
            },
            duration: {
              title: 'Duration',
              filter: true,
              valuePrepareFunction: value => {
                return value + ' Mins'
              }
            },
            post_type: {
              title: 'Debate/Post',
              type: 'html',
              valuePrepareFunction: value => {
                if (value == 1) {
                  return "<span class='badge badge-success badge-pill mb-1'>Post</span>";
                } else if (value == 0) {
                  return "<span class='badge badge-info badge-pill mb-1'>Debate</span>";
                }
              }
            },
            like_count: {
              title: 'Interacts',
              type: 'html',
              valuePrepareFunction: (value, row) => {
                return `<div class="view-list"><i class="fa fa-heart-o" aria-hidden="true"><span>${this.convert(value)}</span></i> ` + `<i class="fa fa-comments-o" aria-hidden="true"><span>${this.convert(row.comment_count)}</span></i> ` + `<i class="fa fa-eye" aria-hidden="true"><span>${this.convert(row.view_count)}</span></i></div>`
              }
            },
            // status: {
            //   title: 'Status',
            //   filter: true,
            //   type: 'html',
            //   valuePrepareFunction: value => {
            //     if (value == 1) {
            //       return "<span class='badge badge-success badge-pill mb-1'>Active</span>";
            //     } else if (value == 0) {
            //       return "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
            //     } else if (value == 2) {
            //       return "<span class='badge badge-pill badge-danger mb-1'>Delete</span>";
            //     }
            //   }
            // }
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

        this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/debate/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
      };
    } else {
      if (event == 'delete') {

        this.settings = {
          selectMode: 'multi',
          hideSubHeader: true,
          columns: {
            topic: {
              title: 'Topic',
              filter: true,
              valuePrepareFunction: value => {
                return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
              }
            },
            category_name: {
              title: 'Category Name',
              filter: true,
              valuePrepareFunction: value => {
                if (this.curentUser && this.curentUser.role == "subadmin") {
                  return 'XXXXX@gmail.com';
                } else {
                  return value ? value : '-';
                }
              }
            },
            role: {
              title: 'Role',
              filter: false,
              type: 'html',
              valuePrepareFunction: (value, row) => {
                //value ? value : '-';
                return value
              }
            },
            start_date: {
              title: 'Start Date',
              filter: true,
              valuePrepareFunction: value => {
                return value ? value : '-';
              }
            },
            start_time: {
              title: 'Start Time',
              filter: true,
              valuePrepareFunction: value => {
                return value ? value : '-';
              }
            },
            post_type: {
              title: 'Debate/Post',
              type: 'html',
              valuePrepareFunction: value => {
                if (value == 1) {
                  return "<span class='badge badge-success badge-pill mb-1'>Post</span>";
                } else if (value == 0) {
                  return "<span class='badge badge-info badge-pill mb-1'>Debate</span>";
                }
              }
            },
            like_count: {
              title: 'Interacts',
              type: 'html',
              valuePrepareFunction: (value, row) => {
                return `<div class="view-list"><i class="fa fa-heart-o" aria-hidden="true"><span>${this.convert(value)}</span></i> ` + `<i class="fa fa-comments-o" aria-hidden="true"><span>${this.convert(row.comment_count)}</span></i> ` + `<i class="fa fa-eye" aria-hidden="true"><span>${this.convert(row.view_count)}</span></i></div>`
              }
            },
            status: {
              title: 'Status',
              filter: true,
              type: 'html',
              valuePrepareFunction: value => {
                if (value == 1) {
                  return "<span class='badge badge-success badge-pill mb-1'>Active</span>";
                } else if (value == 0) {
                  return "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
                } else if (value == 2) {
                  return "<span class='badge badge-pill badge-danger mb-1'>Delete</span>";
                }
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
        // this.delete_btn=false

        this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/debate/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
      } else {
        this.settings = {
          selectMode: 'multi',
          hideSubHeader: true,
          columns: {
            topic: {
              title: 'Topic',
              filter: true,
              type: 'html',
              valuePrepareFunction: value => {
                return `<div class="overflow-text">${value.charAt(0).toUpperCase() + value.substr(1).toLowerCase()}</div>`;
              }
            },
            category_name: {
              title: 'Category Name',
              filter: true,
              valuePrepareFunction: value => {
                return value ? value : '-';
              }
            },
            role: {
              title: 'Role',
              filter: false,
              type: 'html',
              valuePrepareFunction: (value, row) => {
                //value ? value : '-';
                return value
              }
            },
            start_date: {
              title: 'Start Date',
              filter: true,
              valuePrepareFunction: value => {
                if (value) {
                  return new DatePipe('en-US').transform(value, 'dd-MMM-yyyy');
                } else {
                  return null;
                }
              }
            },
            start_time: {
              title: 'Start Time',
              filter: true,
              valuePrepareFunction: value => {
                if (value) {
                  return new DatePipe('en-US').transform(value, 'hh:mm a');
                } else {
                  return null;
                }
              }
            },
            duration: {
              title: 'Duration',
              filter: true,
              valuePrepareFunction: value => {
                return value + ' Mins'
              }
            },
            post_type: {
              title: 'Debate/Post',
              type: 'html',
              valuePrepareFunction: value => {
                if (value == 1) {
                  return "<span class='badge badge-success badge-pill mb-1'>Post</span>";
                } else if (value == 0) {
                  return "<span class='badge badge-info badge-pill mb-1'>Debate</span>";
                }
              }
            },
            like_count: {
              title: 'Interacts',
              type: 'html',
              valuePrepareFunction: (value, row) => {
                return `<div class="view-list"><i class="fa fa-heart-o" aria-hidden="true"><span>${this.convert(value)}</span></i> ` + `<i class="fa fa-comments-o" aria-hidden="true"><span>${this.convert(row.comment_count)}</span></i> ` + `<i class="fa fa-eye" aria-hidden="true"><span>${this.convert(row.view_count)}</span></i></div>`
              }
            },
            // status: {
            //   title: 'Status',
            //   filter: true,
            //   type: 'html',
            //   valuePrepareFunction: value => {
            //     if (value == 1) {
            //       return "<span class='badge badge-success badge-pill mb-1'>Active</span>";
            //     } else if (value == 0) {
            //       return "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
            //     } else if (value == 2) {
            //       return "<span class='badge badge-pill badge-danger mb-1'>Delete</span>";
            //     }
            //   }
            // }
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
        this.delete_btn = false;
        this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/debate/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
      };
    }
  };

  convert(value) {
    if (value >= 1000000) {
      value = (value / 1000000) + "M"
    }
    else if (value >= 1000) {
      value = (value / 1000) + "K";
    }
    return value;
  }

  ngAfterViewInit(): void {
    var data = {
      'skip': 0,
      'limit': 50,
      'status': 0,
    }
    if (typeof this.user_id != 'undefined' && this.user_id != '' && this.user_id != null) {
    };
    this.apiService.CommonApi(Apiconfig.interestList.method, Apiconfig.interestList.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          // this.categoryList = result.data.userData ? result.data.userData : [];
          this.store.categoryList.next(result.data.userData ? result.data.userData : []);
        }
      }
    );
    this.apiService.CommonApi(Apiconfig.getSetting.method, Apiconfig.getSetting.url + 'debate', {}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          var durationList = result.data.settings ? (result.data.settings.duration ? result.data.settings.duration : []) : [];
          durationList.sort(function (a, b) {
            return a.value - b.value;
          });
          this.store.durationList.next(durationList ? durationList : []);
        };
      },
      (error) => {
        console.log(error);
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
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    };
    this.getUserList(data);
  }
}
