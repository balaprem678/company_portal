import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { settings } from 'src/app/interface/interface';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { AngularEditorConfig } from '@kolkov/angular-editor';
@Component({
  selector: 'app-pagesaddedit',
  templateUrl: './pagesaddedit.component.html',
  styleUrls: ['./pagesaddedit.component.scss']
})
export class PagesaddeditComponent implements OnInit {
  editorConfig: AngularEditorConfig = {
    editable: true,
    sanitize: false,
    spellcheck: true,
    height: '15rem',
    minHeight: '5rem',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      ['bold']
    ],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: 'customcheck',
        class: 'customcheck'
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ]
  };
  @ViewChild('pagesForm') form: NgForm;

  pageDetails: any;
  pageTitle: string = 'Add page';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  settings: settings = {
    site_title: '',
    site_url: '',
    site_address: '',
    email_address: '',
    time_zone: '',
    date_format: '',
    time_format: '',
    logo: '',
    light_logo: '',
    favicon: '',
    web_google_map_key: '',
    currency_code: '',
    currency_symbol: '',
  };
  showinputTag: Boolean = false;
  slugTagError: Boolean = false;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  statusOptions = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 2 }
  ];
  selectedStatus: any;

  site_url: any;
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/pages/add' || (split.length > 0 && split[2] == 'pages')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'pages');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };

    if (split && split.length > 3) {
      if ('view' == split[3]) {
        this.viewpage = true;
      }
    };
    // this.store.generalSettings.subscribe(
    //   (result) => {
    //     if (result) {
    //       this.settings = result;
    //     }
    //   }
    // );
  }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.pageTitle = (this.viewpage ? 'View' : 'Edit') + ' ' + "page";
      this.apiService.CommonApi(Apiconfig.pageEdit.method, Apiconfig.pageEdit.url, { id: id }).subscribe(
        (result) => {
          this.pageDetails = result[0];
          this.showinputTag = true;
          this.form.controls['name'].setValue(this.pageDetails.name ? this.pageDetails.name : '');
          this.form.controls['page_content'].setValue(this.pageDetails.description ? this.pageDetails.description : '');
          // this.form.controls['status'].setValue(this.pageDetails.status ? this.pageDetails.status.toString() : '');
         this.selectedStatus = this.pageDetails.status
          this.form.controls['page_title'].setValue(this.pageDetails.seo ? this.pageDetails.seo.title.toString() : '');
          this.form.controls['focusKeyword'].setValue(this.pageDetails.seo ? this.pageDetails.seo.keyword.toString() : '');
          this.form.controls['description'].setValue(this.pageDetails.seo ? this.pageDetails.seo.description.toString() : '');
          if (this.viewpage) {
            this.form.form.disable();
          }

        }
      )
    }

    this.apiService.CommonApi(Apiconfig.getSubCatSetting.method, Apiconfig.getSubCatSetting.url, {}).subscribe((settings) => {
      this.settings = settings[0].settings
    })
  };
   generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/ /g, '-')
        .replace(/_/g, '-') 
        .replace(/[^\w-]+/g, '');
}

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (typeof this.form.controls['slug'] != 'undefined') {
        this.form.controls['slug'].setValue(this.pageDetails ? (this.pageDetails.slug ? this.pageDetails.slug : '') : '');
      }
    }, 1000);
  }

  public onFormSubmit(pagesForm: UntypedFormGroup) {
    this.slugTagError = pagesForm.value.slug ? (pagesForm.value.slug == '' ? true : false) : true;


    if (pagesForm.valid) {
      this.submitebtn = true;
      var data = {
        _id: this.ActivatedRoute.snapshot.paramMap.get('id'),
        slug: (pagesForm.value.name) ? this.generateSlug(pagesForm.value.name) : this.pageDetails.slug ? this.generateSlug(this.pageDetails.slug) : '',
        name: pagesForm.value.name ? pagesForm.value.name : '',
        status: pagesForm.value.status ? pagesForm.value.status : '',
        description: pagesForm.value.page_content ? pagesForm.value.page_content : '',
        seo: {
          description: pagesForm.value.description ? pagesForm.value.description : '',
          keyword: pagesForm.value.focusKeyword ? pagesForm.value.focusKeyword : '',
          title: pagesForm.value.page_title ? pagesForm.value.page_title : '',
        }

      } as any;
      data.slug = data.slug.toLowerCase();
      data.slug = data.slug.replace(/ /g, '-');
      data.url = 'page/';
      this.apiService.CommonApi(Apiconfig.pageSave.method, Apiconfig.pageSave.url, { data: data }).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/app/pages/list']);
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
          this.submitebtn = false;
        }, (error) => {
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

}
