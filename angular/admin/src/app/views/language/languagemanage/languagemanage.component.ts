import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { CustomComponent } from 'src/app/shared/custom.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-languagemanage',
  templateUrl: './languagemanage.component.html',
  styleUrls: ['./languagemanage.component.scss']
})
export class LanguagemanageComponent implements OnInit {
  settings: any;
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  changedValue: any = new Object;
  editid: any;
  current: number = 1;
  source: LocalDataSource = new LocalDataSource();
  global_status: any;
  global_search: any;
  app_filter: any;
  filter_type: any;
  site_title: any;
  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,


  ) {
    this.loadsettings();
  }

  ngOnInit(): void {
    this.editid = this.route.snapshot.paramMap.get('id');

    if (this.editid) {
      let data = {
        code: this.editid,
        current: this.current,
        'skip': this.skip,
        'limit': this.limit
      }
      var filter = {
        app_type: this.app_filter,
        app_filter: this.filter_type,
      }
      this.getData(data, filter);
    }
    this.apiService.CommonApi(Apiconfig.get_general.method, Apiconfig.get_general.url, {}).subscribe(
      (result) => {
        this.site_title = result.site_title
      })
  }
  getData(data, filter) {
    var filtertype = btoa(JSON.stringify(filter))
    this.apiService.CommonApi(Apiconfig.language_Manage.method, Apiconfig.language_Manage.url + '?filters=' + filtertype, data).subscribe(
      (result) => {
        console.log(result)
        this.app_filter = result.app_type;
        this.filter_type = result.app_filter;
        this.changedValue=result.jsondata.data;
        const objectArray = Object.entries(result.jsondata.data);
        var keys = [];
        objectArray.forEach(([key, value]) => {
          keys.push({ content: key, value: value })
        });
        this.source.load(keys);
        this.count = result.jsondata.total;
      })
  }
  onitemsPerPageChange(event) {
    this.limit = event;
    this.default_limit = event;
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      code: this.editid,
      current: this.current,
      'skip': this.skip,
      'limit': this.limit
    }
    var filter = {
      app_type: this.app_filter,
      app_filter: this.filter_type,
    }
    this.getData(data, filter);
  }
  ;
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      code: this.editid,
      current: this.current,
      'skip': this.limit * (event - 1),
      'limit': this.limit,
    };
    var filter = {
      app_type: this.app_filter,
      app_filter: this.filter_type,
    }
    this.getData(data, filter);
  }
  loadsettings() {
    this.settings = {
      selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        content: {
          title: 'Content',
          filter: true,
          class: 'content-class'
        },
        value: {
          title: 'Value',
          filter: false,
          type: "custom",
          renderComponent: CustomComponent,
          sort: false,
          editable: true,
          onComponentInitFunction: (instance: any) => {
            instance.save.subscribe(row => {
              this.changedValue[row.content] = row.value;
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
        // columnTitle: 'Actions',
        class: 'action-column',
        position: 'right',
        custom: [],
      },
    }
  }
  filtersubmit() {
    var filter = {
      app_type: this.app_filter,
      app_filter: this.filter_type,
    }
    let data = {
      code: this.editid,
      current: this.current,
      'skip': this.skip,
      'limit': this.limit
    }
    this.getData(data, filter)
  }
  submiteBtn() {
    if (this.changedValue) {
      var data = {
        app_type: this.app_filter,
        app_filter: this.filter_type,
        data: this.changedValue,
        id: this.editid
      }
      this.apiService.CommonApi(Apiconfig.language_translation_save.method, Apiconfig.language_translation_save.url, {app_type: this.app_filter,app_filter: this.filter_type,id: this.editid,data: this.changedValue}).subscribe(
        (result) => {
            this.router.navigate(['/app/language/list']);
            this.notifyService.showSuccess('Succesfully Updated');
          }       
      )
    }
  }
  download() {
    // console.log(this.changedValue)
    // var blob =  new Blob([this.changedValue], { type: "application/xml" });
    // var objectURL = URL.createObjectURL(blob);
    // var url = this.site_title + '-' + this.editid + '-' + this.app_filter + '-' + this.filter_type + '-' + Date.now() + '.xml';
    // const link = document.createElement('a');
    // link.setAttribute('target', '_blank');
    // link.setAttribute('href',objectURL);
    // link.setAttribute('download',url);
    // document.body.appendChild(link);
    // link.click();
    // link.remove();

    // // var blob =  new Blob([this.changedValue], { type: "application/xml" });
    // // var objectURL = URL.createObjectURL(blob);
    // // var a = document.createElement('a');
    // // a.href = objectURL;
    // // var url = this.site_title + '-' + this.editid + '-' + this.app_filter + '-' + this.filter_type + '-' + Date.now() + '.xml';
    // // a.
  }
  upload() {

  }
}
