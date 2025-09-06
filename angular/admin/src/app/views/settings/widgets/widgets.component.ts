
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
// import { generalSettings } from 'src/app/interface/general-setting.interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { CURRENCY } from 'src/app/_helpers/currency';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from "src/environments/environment";
import { TabsetComponent } from 'ngx-bootstrap/tabs';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { unsubscribe } from 'diagnostics_channel';
@Component({
  selector: 'app-widgets',
  templateUrl: './widgets.component.html',
  styleUrls: ['./widgets.component.scss']
})
export class WidgetsComponent {

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
  @ViewChild('widgetsform') form: NgForm;
  Widget1: any
  Widget2: any
  Widget3: any
  Widget4: any
  Widget5: any
  Widget7:any
  Widget6:any
  site_name: any
  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private store: DefaultStoreService,
    private titleService: Title,
    @Inject(DOCUMENT) private _document: HTMLDocument,
    private router: Router
  ) {

  }
  ngOnInit(): void {
    this.getgeneral();
    this.get_widgets();
  }

  public onFormSubmit(widgetsform: UntypedFormGroup) {


  }


  getgeneral() {
    this.apiService.CommonApi(Apiconfig.get_general.method, Apiconfig.get_general.url, {}).subscribe(res => {
      console.log("getgeneral", res.site_title)
      this.site_name = res.site_title
    })
  }

  save_widgets() {


    var data = {
      footer_widgets_1: this.Widget1,
      footer_widgets_2: this.Widget2,
      footer_widgets_3: this.Widget3,
      footer_widgets_4: this.Widget4,
      footer_widgets_5: this.Widget5,
      footer_widgets_6: this.Widget6,
      footer_widgets_7: this.Widget7,


    }


    this.apiService.CommonApi(Apiconfig.save_widegets.method, Apiconfig.save_widegets.url, data).subscribe(res => {
      // console.log("rest", res, res.modifiedCount)
      if (res && res.data && res.data.modifiedCount > "0") {
        // console.log("rest", res.modifiedCount)
        this.notifyService.showSuccess("Widgets Updated Successfully")
      } else {
        this.notifyService.showError("Something Went Wrong")
      }
    })

  }
  get_widgets() {
    // widgets

    this.apiService.CommonApi(Apiconfig.widgets.method, Apiconfig.widgets.url, {}).subscribe(res => {

      if (res && res != undefined)
        this.Widget1 = res.footer_widgets_1
      this.Widget2 = res.footer_widgets_2
      this.Widget3 = res.footer_widgets_3
      this.Widget4 = res.footer_widgets_4
      this.Widget5 = res.footer_widgets_5
      this.Widget6 = res.footer_widgets_6
      this.Widget7 = res.footer_widgets_7

    })
  }
}
