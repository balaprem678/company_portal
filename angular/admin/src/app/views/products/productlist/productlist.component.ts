import { Component, OnInit, ChangeDetectorRef, AfterViewInit, Input, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { environment } from 'src/environments/environment';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser'
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { FeaturedComponent } from 'src/app/shared/featured.component';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { apis, exportsapi } from 'src/app/interface/interface';
import { EditPriceComponent } from 'src/app/shared/editPrice.component';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { UntypedFormGroup } from '@angular/forms';
import { CloneComponent } from 'src/app/shared/clone.component';
import { ExpensiveComponent } from 'src/app/shared/expensive.component';
import { PopupComponent } from 'src/app/shared/popup.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { TemplateRef } from '@angular/core';

@Component({
  selector: 'app-productlist',
  templateUrl: './productlist.component.html',
  styleUrls: ['./productlist.component.scss']
})
export class ProductlistComponent implements OnInit, AfterViewInit {
  @ViewChild('confirmModal') confirmModal: any;
  @ViewChild('foodForm') form: UntypedFormGroup;
  status: any;
  categorylist: any;
  getcardsdata: any;
  settings: any;
  curreny_symbol : any
  env_url: any = environment.apiUrl;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  bulkuploadStat:boolean=true;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  add_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = true;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/products/add';
  addBtnName: string = 'Product Add';
  editUrl: string = '/app/products/edit/';
  viewUrl: string = '/app/products/view/';
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  filter_action: boolean = true;
  filter_action_list: any[] = [];
  global_filter_action = {} as any;
  deleteApis: apis = Apiconfig.foodDelete;
  productDetails: any;
  error: any;
  disable: any = [];
  restoreApis: apis = Apiconfig.userRestore;
  inactiveApis: apis = Apiconfig.bannerInactive;
  userActive: apis = Apiconfig.bannerActive
  exportApis: exportsapi = Apiconfig.exportproductlist;
  export_btn: boolean = true;
  bulkupload: boolean = false;
  selectedFile: File | null = null;
  bulkTemplate:BsModalRef
  @ViewChild('bulkUploadModal', { static: false }) bulkUploadModal: BsModalRef;
  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private apiService: ApiService,
    private sanitized: DomSanitizer,
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
    private store: DefaultStoreService,
    private modalService:BsModalService
  ) {
    this.loader.loadingSpinner.next(true);
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/products/list' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'products');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
          this.bulk_action=false;
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
        if (this.userPrivilegeDetails[0].status.export) {
          this.export_btn = true;
        } else {
          this.export_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.bulk) {
          this.bulkuploadStat = true;
        } else {
          this.bulkuploadStat = false;
        }
      }
    }
    this.filter_action_list = [
      // {
      //   name: 'City',
      //   tag: 'select',
      //   type: '',
      // },
      // {
      //   name: 'Brands',
      //   tag: 'select',
      //   type: '',
      // },
      {
        name: 'Category',
        tag: 'select',
        type: '',
      },
      {
        name: 'Subcategory',
        tag: 'select',
        type: '',
      },
      {
        name: 'Status',
        tag: 'select',
        type: '',
      }
    ]
    this.loadsettings('');

    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
      console.log(result.currency_symbol, "settingssettingssettingssettingssettingssettingssettingssettings");
      this.curreny_symbol = result && result.currency_symbol != (undefined || null) && result.currency_symbol ? result.currency_symbol : "₹"
    })
  }

  ngOnInit(): void {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status,
      'search': this.global_search
    }
    this.getdata(data)
  }

  getdata(data) {
    this.apiService.CommonApi(Apiconfig.productList.method, Apiconfig.productList.url, data).subscribe(response => {
      if (response && response.length > 0) {
        this.categorylist = response[0];
        this.count = response[1];
        this.source.load(this.categorylist);
        this.cd.detectChanges();
      }
    })
  }
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file format
      const allowedExtensions = ['.xls', '.xlsx'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension && allowedExtensions.includes(`.${fileExtension}`)) {
        this.selectedFile = file;
      } else {
        this.notifyService.showError('Invalid file type. Only .xls or .xlsx are allowed.');
        this.selectedFile = null;
      }
    } else {
      this.selectedFile = null;
    }
  }


  onSaveFile(): void {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('xlsheet', this.selectedFile);
  
      console.log("File to be uploaded:", this.selectedFile);
  
      // Show the spinner
      this.loader.loadingSpinner.next(true);
  
      // Call the API to upload the file
      this.apiService.CommonApi(Apiconfig.foodBulkUpload.method, Apiconfig.foodBulkUpload.url, formData).subscribe(
        (response) => {
          // Hide the spinner
          this.loader.loadingSpinner.next(false);
  
          if (response) {
            if (response.skippedCount === 0) {
              // If no products were skipped, show success
              this.notifyService.showSuccess('Upload Successful');
            } else {
              // If products were skipped, check the count
              if (response.skippedCount > 5) {
                // If skipped count is more than 5, only show the skipped count
                this.notifyService.showSuccess(`${response.skippedCount} products have been skipped.`);
              } else {
                // If skipped count is 5 or less, show the skipped product details
                let skippedDetails = '';
                response.skippedDocuments.forEach(doc => {
                  skippedDetails += `Product: ${doc.product}, Reason: ${doc.reason}\n`;
                });
  
                // Combine the skipped count with the details of skipped products
                this.notifyService.showSuccess(`${response.skippedCount} products have been skipped:\n\n${skippedDetails}`);
              }
            }
  
            // Hide the modal and reset selected file
            this.bulkUploadModal.hide();
            this.selectedFile = null;
  
            // Reload component (if necessary)
            this.ngOnInit();
          }
        },
        (error) => {
          // Hide the spinner on error
          this.loader.loadingSpinner.next(false);
  
          console.log(error, "errorerrorerrorerrorerrorerrorerror");
  
          // Handle error in case of upload failure
          this.notifyService.showError('File upload failed. Please try again.');
        }
      );
  
    } else {
      alert('Please select a file before saving.');
    }
  }
  



  
  onDeleteChange(event) {
    console.log("on delete changee");

    this.ngOnInit();
  };



  onexportChange(event) {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status,
      'search': this.global_search
    }
    this.apiService.CommonApi(this.exportApis.method, this.exportApis.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          console.log(result);
          const blob = new Blob([result.data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          
          // Create a link element to trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = 'productlist.csv';  // Name of the CSV file
          document.body.appendChild(a);
          a.click();
          
          // Clean up the URL and link element
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a)
          // window.open(environment.apiUrl + 'uploads/csv/orders/' + result.message.filename + '.' + result.message.type);
          this.notifyService.showSuccess("Csv Downloaded Successfully");
        } else {
          this.notifyService.showError(result.message);
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )
  }


  onSearchChange(event) {
    console.log("search change");

    this.source = new LocalDataSource();
    this.global_search = event;
    console.log(this.global_search,"this.global_searchthis.global_searchthis.global_search");
    
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': event
    }
    if (Object.keys(this.global_filter_action).length > 0) {
      let searchdata = {
        ...data,
        ...this.global_filter_action
      }
      this.getdata(searchdata);
    } else {
      this.getdata(data);
    }
  };

  onitemsPerPageChange(event) {
    console.log("onItemPerpage event is require");

    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'search': this.global_search
    }
    if (Object.keys(this.global_filter_action).length > 0) {
      let perpagedata = {
        ...data,
        ...this.global_filter_action
      }
      this.getdata(perpagedata);
    } else {
      this.getdata(data);
    }
  };
  onPageChange(event) {
    console.log(event, "why this is here++++++++++");
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'search': this.global_search
    };
    if (Object.keys(this.global_filter_action).length > 0) {
      let pagechangedata = {
        ...data,
        ...this.global_filter_action
      }
      this.getdata(pagechangedata);
    } else {
      this.getdata(data);
    }

  }

  onheaderCardChange(event) {
    console.log(event, 'this is event in another universee');

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

  changefeatured(id, feature) {
    console.log(id, 'id id id', feature, 'feature feature');
    var data = {
      db: "food",
      id: id,
      value: 1,
      for: 'expensive'
    };
    if (feature == 1) {
      data.value = 0;
    } else {
      data.value = 1;
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

  changeStatus(id, feature) {

    var data = {
      db: "food",
      id: id,
      value: 1
    };
    if (feature == 1) {
      data.value = 2;
    }
    console.log("data", data)
    this.apiService.CommonApi(Apiconfig.categoryFeatured.method, Apiconfig.categoryFeatured.url, data).subscribe(response => {
      if (response && response.status == 1) {
        this.notifyService.showSuccess("Successfully Updated");
        this.ngOnInit();
      } else {
        this.notifyService.showError("Something went wrong. Please try again later.");
      }
    })
  }

  onFilterAction(event) {
    console.log("this is on filter");

    this.source = new LocalDataSource();
    if (event && event.City != '') {
      this.global_filter_action.city = event.City;
    } else {
      delete this.global_filter_action.city;
    }

    if (event && event.Brands != '') {
      this.global_filter_action.brandname = event.Brands;
    } else {
      delete this.global_filter_action.brandname;
    }
    if (event && event.Status != '') {
      this.global_status = parseInt(event.Status);
      this.global_filter_action.publish = event.Status;
    } else {
      delete this.global_filter_action.publish;
    }
    if (event && event.Recommended != '') {
      this.global_filter_action.isRecommeneded = event.Recommended;
    } else {
      delete this.global_filter_action.isRecommeneded;
    }
    if (event && event.Category != '') {
      this.global_filter_action.rcat = event.Category;
    } else {
      delete this.global_filter_action.rcat;
    }
    if (event && event.Subcategory != '') {
      this.global_filter_action.scat = event.Subcategory;
    } else {
      delete this.global_filter_action.scat;
    }
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': true
    };
    let filterdata = {
      ...data,
      ...this.global_filter_action
    };
    this.getdata(filterdata);
  }

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          name: {
            title: 'Product Name',
            filter: true,
            type: 'html',
            valuePrepareFunction: (value, row) => {
              return `<div class="overflow-text">${(value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() + (typeof row.last_name != 'undefined' ? row.last_name : ''))}</div>`;
            }
          },
          avatar: {
            title: 'Image ',
            filter: false,
            type: "html",
            valuePrepareFunction: image => {
              return '<img src="' + environment.apiUrl + image + '" width="32" height="32">';
            }
          },
          rcategory: {
            title: 'Category Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.rcatname.charAt(0).toUpperCase() + value.rcatname.substr(1).toLowerCase();
            }
          },
          status: {
            title: 'Status',
            filter: true,
            type: 'custom',
            renderComponent: PopupComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe(row => {
                this.changeStatus(row._id, row.status);
              });
            }
          },
          sale_price: {
            title: 'Sale Price',
            filter: false,
            valuePrepareFunction: value => {
              return value;
            }
          },
          createdAt: {
            title: 'Created At',
            filter: false,
            valuePrepareFunction: value => {
              var date = value ? new DatePipe('en-US').transform(value, 'MMMM dd,yyyy hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy');
              return date;
            }
          },
          // isRecommeneded: {
          //   title: 'Recommended Product',
          //   filter: false,
          //   type: "custom",
          //   renderComponent: FeaturedComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.changefeatured(row._id, row.isRecommeneded);
          //     });
          //   }
          // },
          // EditPrice: {
          //   title: 'Edit Price',
          //   filter: false,
          //   type: "custom",
          //   renderComponent: EditPriceComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.changefeatured(row._id, row.isRecommeneded);
          //     });
          //   }
          // },
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/category/category-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          // index: {
          //   title: 'S No',
          //   type: 'text',
          //   valuePrepareFunction: (value, row, cell) => {
          //     return this.skip + cell.row.index + 1 + '.'
          //   }
          // },
          // name: {
          //   title: 'Name',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
          //   }
          // },
          avatar: {
            title: 'Image',
            filter: false,
            type: "html",
            valuePrepareFunction: image => {
              return '<img src="' + environment.apiUrl + (image.fallback || image) + '" width="40" height="40">';
            }
          },
          name: {
            title: 'Product Name',
            filter: true,
            type: 'html',
            valuePrepareFunction: (value, row) => {
              return `<div class="overflow-text pdt_list_name">${(value.charAt(0).toUpperCase() + value.substr(1).toLowerCase() + (typeof row.last_name != 'undefined' ? row.last_name : ''))}</div> <div class="pdt_list_details" >${row.rcategory.rcatname.charAt(0).toUpperCase() + row.rcategory.rcatname.substr(1).toLowerCase()}</div>`;
            }
          },
        
          // rcategory: {
          //   title: 'Category Name',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     return value.rcatname.charAt(0).toUpperCase() + value.rcatname.substr(1).toLowerCase();
          //   }
          // },
         
          // isRecommeneded: {
          //   title: 'Recommended Product',
          //   filter: false,
          //   type: "custom",
          //   renderComponent: FeaturedComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.changefeatured(row._id, row.isRecommeneded);
          //     });
          //   }
          // },
          sale_price: {
            title: 'Sale Price',
            filter: false,
            valuePrepareFunction: value => {
              // return `MRP ${value}`;
              return (this.curreny_symbol ? this.curreny_symbol : "₹") + ' ' + value;
            }
          },
          createdAt: {
            title: 'Published',
            filter: false,
            valuePrepareFunction: value => {
              var date = value ? new DatePipe('en-US').transform(value, 'MMMM dd,yyyy hh:mm a') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy');
              return date;
            }
          },
          // expensive: {
          //   title: 'Featured',
          //   filter: false,
          //   type: "custom",
          //   renderComponent: ExpensiveComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       console.log(row,"row from productlist");
                
          //       this.changefeatured(row._id, row.expensive)
          //     });
          //   }
          // },
          status: {
            title: 'Status',
            filter: true,
            type: 'custom',
            renderComponent: PopupComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe(row => {
                this.changeStatus(row._id, row.status);
              });
            }
          },
          // Clone: {
          //   title: 'Clone',
          //   filter: false,
          //   type: "custom",
          //   renderComponent: CloneComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.cloneDetails(row)
          //     });
          //   }
          // },
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/category/category-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };

  ngAfterViewInit(): void {
    this.apiService.CommonApi(Apiconfig.productcatgory.method, Apiconfig.productcatgory.url, {}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.store.categoryList.next(result.list ? result.list : []);
        }
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productbrandns.method, Apiconfig.productbrandns.url, {}).subscribe(
      (result) => {
        if (result && result.length == 1) {
          this.store.brandsList.next(result[0].length > 0 ? result[0] : []);
        };
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productcity.method, Apiconfig.productcity.url, {}).subscribe(
      (result) => {
        if (result && result.length > 0) {
          this.store.cityList.next(result[0].length > 0 ? result[0] : []);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  };
  cancel() {
    this.confirmModal.show()
  }
  editPrice(value) {
    this.apiService.CommonApi(Apiconfig.foodEdit.method, Apiconfig.foodEdit.url, { id: value._id }).subscribe(response => {
      if (response) {
        this.productDetails = response.foodDetails;

        this.confirmModal.show()
      }
    })

  }
  setPrice(event, index) {
    console.log(event.target.checked);
    if (event.target.checked) {
      this.form.controls[`sprice${index}`].disable()
      this.productDetails.price_details[index].sprice = this.productDetails.price_details[index].mprice;
    } else {
      this.form.controls[`sprice${index}`].enable()
      this.productDetails.price_details[index].sprice = ''
    }

  }

  removeAttri(index) {
    console.log(index);
    this.productDetails.price_details.splice(index, 1)
  }

  cloneDetails(row) {
    this.router.navigate([`/app/products/food-clone/${row._id}`]);
  }

  public Changeprice(foodForm: UntypedFormGroup) {
    this.error = 'VALID';
    this.productDetails.price_details.forEach(element => {
      if (element.mprice < element.sprice) {
        this.error = "INVALID"
      }
    });
    if (foodForm.status != "INVALID" && this.error != "INVALID") {
      this.apiService.CommonApi(Apiconfig.foodAdd.method, Apiconfig.foodAdd.url, this.productDetails).subscribe(
        (result) => {
          this.confirmModal.hide()
          this.notifyService.showSuccess("Successfully updated.");
        },
        (error) => {
          console.log(error);
        }
      );
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

  openBulkUpload(template){


    this.bulkUploadModal = this.modalService.show(template,{class:'modal-content' ,id:1,ignoreBackdropClick:false})

  }
}
