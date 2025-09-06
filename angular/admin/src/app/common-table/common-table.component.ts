import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BsModalRef, BsModalService, ModalDirective } from 'ngx-bootstrap/modal';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { apis, restoreapis, exportsapi } from '../interface/interface';
import { ApiService } from '../_services/api.service';
import { NotificationService } from '../_services/notification.service';
import { UntypedFormGroup, UntypedFormControl, UntypedFormBuilder, Validators, FormControl } from '@angular/forms';
import { DefaultStoreService } from '../_services/default-store.service';
import { Apiconfig } from '../_helpers/api-config';
import { SpinnerService } from '../_services/spinner.service';
import { SendmailComponent } from '../shared/sendmail.component';
import { log } from 'console';

@Component({
  selector: 'app-common-table',
  templateUrl: './common-table.component.html',
  styleUrls: ['./common-table.component.scss']
})
export class CommonTableComponent implements OnInit {

  @Input() settings: any;
  @Input() db: any;
  @Input() source: any;
  @Input() count: number = 0;
  @Input() itemsPerPage: number = 10;
  @Input() itemOptionsPerPage = [5, 10, 50, 100];
  @Input() tablename: string = '';
  @Input() add_btn: boolean = false;
  @Input() template: boolean = false;
  @Input() export_btn: boolean = false;
  @Input() category: boolean = false;
  @Input() bulkupload: boolean = false;
  @Input() support_ticket: boolean = false;
  @Input() filter_transaction_list: boolean = false;
  @Input() addBtnUrl: string = '/';
  @Input() addBtnName: string = '';
  @Input() editUrl: string = '';
  @Input() manageurl: string = '';
  @Input() viewUrl: string = '';
  @Input() deleteApis: apis;
  @Input() card_details: any[] = [];
  @Input() showSearch = true;
  @Input() bulk_action: boolean = false;
  @Input() activeBulkAction: boolean = false;
  @Input() exportApis: exportsapi;
  @Input() restoreApis: restoreapis;
  @Input() inactiveApis: restoreapis;
  @Input() ActiveApis: restoreapis;
  @Input() filter_action: boolean = false;
  @Input() filter_action_list: any[] = [];
  @Input() user_based_name: string;
  @Input() cardActive: string;
  @Input() notification_action: boolean = false;
  @Input() user_list_filter_action: boolean = false;
  @Input() permanentdelete: apis
  @Input() subscribeMail: boolean=true;


  @Output() onPageChange: EventEmitter<any> = new EventEmitter();
  @Output() onitemsPerPageChange: EventEmitter<any> = new EventEmitter();
  @Output() onDeleteChange: EventEmitter<any> = new EventEmitter();
  @Output() onInactivechange: EventEmitter<any> = new EventEmitter();
  @Output() onheaderCardChange: EventEmitter<any> = new EventEmitter();
  @Output() onSearchChange: EventEmitter<any> = new EventEmitter();
  @Output() onNotificationAction: EventEmitter<any> = new EventEmitter();
  @Output() onFilterAction: EventEmitter<any> = new EventEmitter();
  @Output() onexportChange: EventEmitter<any> = new EventEmitter()
  @Output() addSubEmail: EventEmitter<any> = new EventEmitter()
  tabledelete: boolean = false
  maxDate = new Date();
  currentPerPage: number = 1;
  seletedRow = [];
  bulkactions: string = null;
  bulkSelect: boolean = false;
  username: string = '';
  password: string = '';
  restoreData: any;
  forcedelete: boolean = false;
  isCollapsed = true;
  filterForm: UntypedFormGroup
  categoryList: any[] = [];
  subcategoryList: any[] = [];
  brandsList: any[] = [];
  feedList: any[] = [];
  cityList: any[] = [];
  url: any;
  userUrl: any
  touched: boolean = true;
  filterData = {
    City: "",
    Brands: "",
    Status: "",
    Recommended: "",
    Category: "",
    Subcategory: "",
    From_Date: "",
    To_Date: "",
    id: ""
  };
  newEmail: any;
  feed: any;
  brands: any;
  plan: any;
  Category: any;
  status: any;
  subcategory: any;
  recommended: any;
  city: any;
  search_value: any = ''
  bulkActionControl = new FormControl()
  showInput: boolean = false;
  @ViewChild('bulkUploadTemplate') bulkUploadTemplate: any;
  modalRefs: BsModalRef
  selectedFile: File | null = null;
  bulkActionOptions: { label: string; value: string }[] = [
    // { label: 'Bulk Action', value: 'bulkaction' },
    { label: 'Delete', value: 'delete' }
  ];

  statusOptions = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 2 }
  ];

  @ViewChild('deleteModal', { static: false }) deleteModal: ModalDirective;
  @ViewChild('restoreModal', { static: false }) restoreModal: ModalDirective;
  @ViewChild('inactiveModal', { static: false }) inactiveModal: ModalDirective;
  @ViewChild('searchfeild', { static: false }) searchfield;
  modalName: any;
  valueChange: number;
  minDate: any;
  modalRef?: BsModalRef
  submitted: boolean = false;
  subscribe_email_list: any;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private formBuilder: UntypedFormBuilder,
    private store: DefaultStoreService,
    private loader: SpinnerService,
    private modalService: BsModalService
  ) {
    this.url = this.router.url
    this.userUrl = '/app/users/list'
  }

  ngOnInit(): void {

    this.search_value = ''
    this.feed = '';
    this.brands = '';
    this.plan = '';
    this.Category = '';
    this.status = '';
    this.subcategory = '';
    this.recommended = '';
    this.city = '';
    this.maxDate.setDate(this.maxDate.getDate())
    this.filterForm = this.formBuilder.group({});
    this.filter_action_list.forEach((item, index) => {
      this.filterForm.addControl(`field_${index}`, new UntypedFormControl(''))
    });
    this.store.categoryList.subscribe(
      (result) => {
        if (result) {
          this.categoryList = result;
        }
      }
    )
    this.store.brandsList.subscribe(
      (result) => {
        if (result) {
          this.brandsList = result;
        }
      }
    )
    this.store.cityList.subscribe(
      (result) => {
        if (result) {
          this.cityList = result;

        }
      }
    )
    if (this.user_list_filter_action) {
      this.addActiveOption()
    }
    if (this.activeBulkAction) {
      this.removeInactiveOption()
    }
  };

  openBulkUploadModal() {
    this.modalRefs = this.modalService.show(this.bulkUploadTemplate);
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel')) {
      this.selectedFile = file;
    } else {
      this.notifyService.showError('Invalid file format. Please upload an Excel file.');
    }
  }

  saveBulkUpload(): void {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      // Call your API service to handle file upload
      // this.apiService.uploadBulkData(formData).subscribe({
      //   next: (response) => {
      //     this.notifyService.showSuccess('File uploaded successfully');
      //     this.modalRefs?.hide();
      //     this.selectedFile = null;
      //   },
      //   error: (error) => {
      //     this.notifyService.showError('File upload failed');
      //   }
      // });
    } else {
      this.notifyService.showError('Please select a file to upload.');
    }
  }


  addActiveOption() {
    this.bulkActionOptions.push({ label: 'Active', value: 'active' });
  }

  removeInactiveOption() {
    this.bulkActionOptions.push({ label: 'Inactive', value: 'inactive' });
  }

  onChangeDate(event, i) {
    if (i == 0)
      this.minDate = event
  }

  filterSubmite() {
    this.filter_action_list.forEach((item, index) => {
      this.filterData[item.name.split(" ").join("_")] = this.filterForm.value[`field_${index}`];
    })
    this.onFilterAction.emit(this.filterData);
    this.isCollapsed = !this.isCollapsed
    this.modalRef.hide()
  };
  clearformData() {
    this.filterData = {
      City: "",
      Category: "",
      Subcategory: "",
      Brands: "",
      From_Date: "",
      To_Date: "",
      Status: "",
      Recommended: "",
      id: ""
    }

    this.onFilterAction.emit(this.filterData);
    setTimeout(() => {
      this.feed = '';
      this.brands = '';
      this.plan = '';
      this.Category = '';
      this.status = '';
      this.subcategory = '';
      this.recommended = '';
      this.city = '';
    }, 1000);
  }
  customClassAdd(length) {
    if (length == 3 || length == 4) {
      return 'col-sm-4 col-lg-3'
    } else if (length == 5) {
      return 'custom-class-col-5'
    } else if (length == 6) {
      return 'custom-class-col-6'
    } else if (length == 7) {
      return 'custom-class-col-7'
    }
  }
  onCustomAction(event) {
    if (event.action == 'editaction') {
      if (this.editUrl != '') {
        if (event.data.banner_name || event.data.type_name == 'batchs') {
          this.router.navigate([this.editUrl, event.data.type_name, event.data._id]);
        } else {
          this.router.navigate([this.editUrl, event.data._id]);

        }
      }
    } else if (event.action == 'deleteaction') {
      this.seletedRow = [event.data];
      this.forcedelete = false;
      this.tabledelete = true
      this.deleteModal.show();
    }
    else if (event.action == 'viewaction') {
      if (this.viewUrl != '') {
        if (event.data.foods && event.data.foods.status && (event.data.foods.status == 16 || event.data.foods.status == 17 || event.data.foods.status == 18)) {
          if (event.data.foods.status == 16) {
            const time = new Date(event.data.foods.return_date);
            // Get the timestamp
            const timestamp = time.getTime();
            console.log(timestamp);
            this.router.navigate([this.viewUrl, event.data._id, timestamp, event.data.foods.status]);
          }
          else if (event.data.foods.status == 17) {
            const time = new Date(event.data.foods.collected_date);
            // Get the timestamp
            const timestamp = time.getTime();
            console.log(timestamp);
            this.router.navigate([this.viewUrl, event.data._id, timestamp, event.data.foods.status]);
          }
          else {
            const time = new Date(event.data.foods.refund_date);
            // Get the timestamp
            const timestamp = time.getTime();
            console.log(timestamp);
            this.router.navigate([this.viewUrl, event.data._id, timestamp, event.data.foods.status]);
          }
        } else {
          this.router.navigate([this.viewUrl, event.data._id]);
        }
      }
    }
    else if (event.action == 'restoreaction') {
      this.restoreModal.show();
      this.restoreData = event.data;
    }
    else if (event.action == 'forcedeleteaction') {
      this.deleteModal.show();
      this.forcedelete = true;
      this.seletedRow = [event.data];
    }
    else if (event.action == 'manageaction') {
      if (this.manageurl != '') {
        this.router.navigate([this.manageurl, event.data.code]);
      }
    }
  };
  sendMailNotify(type) {
    if (this.seletedRow.length == 0) {
      if (type == 'mail') {
        this.notifyService.showError('Please select user to send email');
        return;
      } else {
        this.notifyService.showError('Please select user to send notification');
        return;
      }
    } else {
      let data = {
        type: type,
        data: this.seletedRow
      };
      this.onNotificationAction.emit(data);
    }
  };


  addSubscriber() {
    const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;


    if (!expression.test(this.newEmail.trim())) {
      return this.notifyService.showError('Enter a valid email');
    }


    this.apiService.CommonApi(Apiconfig.subscribeDataList.method, Apiconfig.subscribeDataList.url, {}).subscribe(result => {
      if (result && result.status === true) {
        this.subscribe_email_list = result.doc;


        const emailExists = this.subscribe_email_list.some(item => item.email === this.newEmail.trim());

        if (emailExists) {
          this.notifyService.showSuccess(`User with email ${this.newEmail.trim()} is already subscribed`);
        } else {
          this.addSubEmail.emit(this.newEmail.trim())
          this.notifyService.showSuccess(`Subscribed Successfully`);
          this.submitted = true
          this.newEmail = ''
        }
      }
    })
  }

  sendMail1(){
    this.router.navigate(['/app/users/emailtemplate'])
  }



  sendMail(type) {
    console.log(this.seletedRow.length, 'selectedRow');

    if (this.seletedRow.length == 0) {
      console.log('hi this is the selected Row');

      if (type == 'mail') {
        console.log("sendmail");

        // this.modalService.show(SendmailComponent)

        this.notifyService.showError('Please select user to send email');
        return;
      } else {
        this.notifyService.showError('Please select user to send notification');
        return;
      }
    }else {
      let data = {
        type: type,
        data: this.seletedRow
      };
      console.log(data, 'data');
      this.router.navigate(['/app/users/emailtemplate'])

      this.onNotificationAction.emit(data);
    }
  };

  headercardfun(event) {
    this.currentPerPage = 1;
    this.onheaderCardChange.emit(event);
    this.cardActive = event;
  }

  Pagechange(event) {
    if (event && typeof event.page != 'undefined') {
      this.currentPerPage = event.page;
      this.onPageChange.emit(event.page);
    }
  }

  PerPagechange(event) {
    if (event && event.pagingConf && event.pagingConf.perPage) {
      this.currentPerPage = 1;
      this.onitemsPerPageChange.emit(event.pagingConf.perPage);
    }
  }

  onUserRowSelect(event) {
    this.seletedRow = event.selected;
    if (event.selected && event.selected.length > 0) {
      this.bulkSelect = true;
    } else {
      this.bulkSelect = false;
    }
    // this.deleteModal.show();
  }
  timer = null;
  onSearchKeyUp(event) {
    console.log('sdfksdkfskd', this.timer);

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.currentPerPage = 1;
      this.onSearchChange.emit(event);
      this.onFilterAction.emit(this.filterData);

    }, 100);
  };
  bulkActionChange() {
    if (this.bulkactions != 'bulkaction') {
      if (this.bulkactions && this.bulkactions == 'delete') {
        this.username = '';
        this.password = ''
        this.deleteModal.show();
      } else {
        if (this.bulkactions && this.bulkactions == 'inactive') {
          this.username = '';
          this.password = ''
          this.inactiveModal.show()
          this.modalName = "Inactive"
        } else {
          if (this.bulkactions && this.bulkactions == 'active') {
            this.modalName = "Active"
            this.username = '';
            this.password = ''
            this.inactiveModal.show()
          } else {

          }
        }
      }
    } else {
      this.notifyService.showError('Please choose any one action');
    }
  }
  confirm() {
    if (this.bulkSelect) {
      if (this.username == '' || typeof this.username == 'undefined') {
        this.notifyService.showError('Please enter Username');
        return false;
      }
      if (this.password == '' || typeof this.password == 'undefined') {
        this.notifyService.showError('Please enter Password');
        return false;
      }
    };
    var data = this.seletedRow.map(x => x._id);
    console.log(this.forcedelete, 'this is force delete');
    // console.log(this.permanentdelete.method, 'this.permanentdelete.method');
    // console.log(this.permanentdelete.url, 'this.permanentdelete.url');

    if (this.forcedelete) {
      console.log("hi this is okke?");
      this.apiService.CommonApi(this.permanentdelete.method, this.permanentdelete.url, { ids: data, username: this.username, password: this.password, forcedelete: this.forcedelete, tabledelete: this.tabledelete }).subscribe(
        (result) => {

          if (result && result.ok == 1) {

            this.forcedelete = false;
            this.bulkSelect = false;
            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            this.deleteModal.hide();
            // this.username = ''
            // this.password = ''

            this.onDeleteChange.emit(result);
          } else if (result && result.status == 1) {

            this.forcedelete = false;
            this.bulkSelect = false;
            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            this.deleteModal.hide();
            // this.username = ''
            // this.password = ''

            this.onDeleteChange.emit(result);
          }
          else {

            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            this.deleteModal.hide();
            // this.username = ''
            // this.password = ''

            this.onDeleteChange.emit(result);
          }
        },
        (error) => {
          console.log(error, 'error1');

          this.notifyService.showError(error.msg);
        }
      )
    } else if (this.tabledelete == true) {
      this.apiService.CommonApi(this.deleteApis.method, this.deleteApis.url, {
        ids: data, username: this.username,
        password: this.password, forcedelete: this.forcedelete, tabledelete: this.tabledelete
      }).subscribe(
        (result) => {
          console.log(result, 'RESULT');

          if (result && result.ok == 1) {

            this.forcedelete = false;
            this.bulkSelect = false;
            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            // this.username = ''
            // this.password = ''
            this.deleteModal.hide();


            this.onDeleteChange.emit(result);
          } else if (result && result.status == 1) {

            this.forcedelete = false;
            this.bulkSelect = false;
            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            // this.username = ''
            // this.password = ''
            this.deleteModal.hide();


            this.onDeleteChange.emit(result);
          }
          else if (result.status == false) {
            this.notifyService.showError(result.msg);
          }
          else {

            if (result.item === "tag") {
              this.deleteModal.hide();
              this.onDeleteChange.emit(result);
              return this.notifyService.showSuccess("Tag deleted successfully");
            }

            this.notifyService.showSuccess("Deleted successfully.");
            this.deleteModal.hide();
            // this.username = ''
            // this.password = ''

            this.onDeleteChange.emit(result);
          }
        },
        (error) => {

          // this.notifyService.showError(error.msg);
          this.notifyService.showError(error.error.msg);
        }
      )
    } else {
      console.log(this.deleteApis.url, "hlo this is okke?");
      this.apiService.CommonApi(this.deleteApis.method, this.deleteApis.url, { ids: data, username: this.username, password: this.password, forcedelete: this.forcedelete, tabledelete: this.tabledelete }).subscribe(
        (result) => {
          console.log(result, 'RESULT');

          if (result && result.ok == 1) {

            this.forcedelete = false;
            this.bulkSelect = false;
            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            // this.username = ''
            // this.password = ''
            this.deleteModal.hide();


            this.onDeleteChange.emit(result);
          } else if (result && result.status == 1) {

            this.forcedelete = false;
            this.bulkSelect = false;
            this.bulkactions = 'bulkaction';
            this.notifyService.showSuccess("Deleted successfully.");
            // this.username = ''
            // this.password = ''
            this.deleteModal.hide();


            this.onDeleteChange.emit(result);
          }
          else if (result.status == false) {
            this.notifyService.showError(result.msg);
          }
          else {
            this.notifyService.showSuccess("Deleted successfully.");
            this.deleteModal.hide();
            // this.username = ''
            // this.password = ''

            this.onDeleteChange.emit(result);
          }
        },
        (error) => {

          this.notifyService.showError(error.error.msg);
        }
      )
    }

  };

  confirmInActive() {
    if (this.bulkSelect) {
      if (this.username == '' || typeof this.username == 'undefined') {
        this.notifyService.showError('Please enter Username');
        return false;
      }
      if (this.password == '' || typeof this.password == 'undefined') {
        this.notifyService.showError('Please enter Password');
        return false;
      }


    }

    if (this.bulkactions == 'active') {
      this.valueChange = 1
    }


    if (this.bulkactions == 'inactive') {
      this.valueChange = 2
    }


    var changedata = {};
    var data = this.seletedRow.map(x => x._id);
    if (this.inactiveApis.url == "admins/multichangeStatus") {
      changedata = { ids: data, value: this.valueChange, db: this.db ? this.db : this.inactiveApis.db, username: this.username, password: this.password };
    } else {
      changedata = { ids: data, username: this.username, password: this.password };
    }
    this.apiService.CommonApi(this.inactiveApis.method, this.inactiveApis.url, changedata).subscribe(
      (result) => {
        // console.log("sdfwsefresult", result)
        if (result && result.status == 1) {
          this.bulkactions = 'bulkaction'
          console.log("sdfwsef", this.bulkactions)
          // this.forcedelete = false;
          this.bulkSelect = false;
          // this.bulkactions = ""
          if (this.inactiveApis.db && this.inactiveApis.db == 'users') {

            this.notifyService.showSuccess("User status updated");
          } else if (this.inactiveApis.db && this.inactiveApis.db == 'bannertype') {
            this.notifyService.showSuccess("Status changed Sucessfully");
          } else {
            this.notifyService.showSuccess(result.message);

          }
          this.inactiveModal.hide();
          // this.username = ''
          // this.password = ''
          this.onInactivechange.emit(result);
        } else {
          this.notifyService.showError(result.message);
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )

  }

  confirmRestore() {
    if (this.restoreData && this.restoreData._id) {
      var data = {};
      if (this.restoreApis.url == 'admins/changeStatus') {
        data = { id: this.restoreData._id, value: this.restoreApis.value, db: this.restoreApis.db }
      } else {
        data = { ids: this.restoreData._id };
      }
      this.apiService.CommonApi(this.restoreApis.method, this.restoreApis.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.bulkSelect = false;
            this.notifyService.showSuccess(result.message ? result.message : "Successfully updated.");
            this.restoreModal.hide();
            // this.username = ''
            // this.password = ''
            this.onDeleteChange.emit(result);
          } else {
            this.notifyService.showError(result.message);
          }
        },
        (error) => {
          this.notifyService.showError(error.message);
        }
      )
    }
  }

  exportFunction(key) {
    // console.log("data comming")
    var data = {};
    if (this.exportApis.url == Apiconfig.exportdashboardorder.url) {
      data = { status: this.filterData.Status, start_date: this.filterData.From_Date, end_date: this.filterData.To_Date, city: this.filterData.City }
    }
    this.onexportChange.emit(data)

  }
  downloadFile(url) {
    window.open(url);
  }
  getsubcategory(value) {
    if (value)
      this.apiService.CommonApi("post", "scategory/get_all_sub", { id: value }).subscribe(
        (result) => {
          console.log("comming not  in the else part of the get sub category function ", result)
          if (result && result.length > 0) {
            this.subcategoryList = result;


          } else {
            this.subcategoryList = []
            // console.log("comming in the else part of the get sub category function ", this.subcategoryList)
          }
        },
        (error) => {
          this.notifyService.showError(error.message);
        }
      )
  }
  destroySearc() {
    setTimeout(() => {
      this.searchfield.nativeElement.value = '';
    }, 500);
  }

  openModal(template: any) {
    this.modalRef = this.modalService.show(template, { class: 'select_filter_modal' });
  }
}
