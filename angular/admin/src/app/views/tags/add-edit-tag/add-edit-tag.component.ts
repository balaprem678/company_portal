import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SearchCountryField,
  CountryISO,
  PhoneNumberFormat,
} from '@khazii/ngx-intl-tel-input';
import { ApiService } from 'src/app/_services/api.service';
import { COUNTRY } from 'src/app/_services/country';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { interest, language } from 'src/app/interface/interface';
import { NotificationService } from 'src/app/_services/notification.service';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { RootUserDetails } from 'src/app/interface/userDetails.interface';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { PrivilagesData } from 'src/app/menu/privilages';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
const phoneNumberUtil = PhoneNumberUtil.getInstance();

@Component({
  selector: 'app-add-edit-tag',
  templateUrl: './add-edit-tag.component.html',
  styleUrls: ['./add-edit-tag.component.scss'],
})
export class AddEditTagComponent {
  colorOptions = [
    { name: 'Pink', value: '#FDEDEC' },
    { name: 'Violet', value: '#F5EEF8' },
    { name: 'Blue', value: '#D6EAF8' },
    { name: 'Green', value: '#D5F5E3' },
    { name: 'Orange', value: '#FDF2E9' },
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
  ];

  @ViewChild('tagAddEditForm') form: NgForm;
  modalLogoutRef: BsModalRef;

  categorylist: any = [];
  productlist: any = [];
  rcategorylist: any = [];
  sub_category_id: any;
  userimageChangedEvent: any = '';
  batchimageChangedEvent: any = '';
  usercroppedImage: any = 'assets/image/user.jpg';
  usercroppedBatchImage: any = 'assets/image/user.jpg';
  interestList: interest[] = [];
  languageList: language[] = [];
  test = 'Select Your languages';
  coverimageChangedEvent: any = '';
  coverCroppedImage: any = 'assets/image/coverimg.png';
  coverfinalImage: File;
  userfinalImage: File;
  userDetails: any;
  RootUserDetails: RootUserDetails;
  pageTitle: string = 'Add Tag';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  imageurl: string = environment.apiUrl;
  emailVerifyTag: number = 2;
  minDate: Date = new Date();
  @ViewChild('search') public searchElementRef: ElementRef;
  public latitude: number;
  public longitude: number;
  private geoCoder;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[];
  checkpassword: boolean = false;
  agm_address = {
    fulladres: '',
  };
  address: { fulladres: string };
  user_image: any;
  croppedImage: any = '';
  croppedBatchImage: any = '';
  currentEmail: any;
  removerPhoto: boolean = false;
  statusOptions = [
    { label: '--Select--', value: '' },
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' },
  ];
  categoryOptions = [];
  productOptions = [];
  dropdownBorderRadius1 = 4;
  editTag: any;
  tagObjectId: any;
  imageFile: any;
  preview: string;
  tagNameCheckerVal = '';
  tagNames = [];
  tag_url: any;

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    // private mapsAPILoader: MapsAPILoader,
    private store: DefaultStoreService,
    private ngZone: NgZone,
    private authService: AuthenticationService,
    private modalService: BsModalService
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == 'subadmin') {
      if (
        this.router.url == '/app/users/add' ||
        (split.length > 0 && split[2] == 'users')
      ) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(
          (x) => x.alias == 'users'
        );
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        }
        if (
          !this.userPrivilegeDetails[0].status.add &&
          !this.ActivatedRoute.snapshot.paramMap.get('id')
        ) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        }
        if (
          !this.userPrivilegeDetails[0].status.edit &&
          this.ActivatedRoute.snapshot.paramMap.get('id')
        ) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        }
      }
    }
    if (split && split.length > 3) {
      if ('edit' == split[3]) {
        this.viewpage = true;
        console.log('edit page condition ');
        this.ActivatedRoute.params.subscribe((params) => {
          let id = params.id;
          this.tagObjectId = id;
          console.log(params.id);
          this.apiService
            .CommonApi(
              Apiconfig.tagGetSingle.method,
              Apiconfig.tagGetSingle.url,
              { id }
            )
            .subscribe((res) => {
              console.log(res, 'change event in the tags...');
              this.editTag = res;
              this.form.controls['first_name'].setValue(
                this.editTag.tagName ? this.editTag.tagName : ''
              );
              // this.form.controls['last_name'].setValue(
              //   this.editTag.tagUrl ? this.editTag.tagUrl : ''
              // );
              // this.form.controls['last_name'].setValue(
              //   this.editTag.tagUrl ? this.editTag.tagUrl : ''
              // );
              this.form.controls['status'].setValue(
                this.editTag.status ? this.editTag.status.toString() : ''
              );
              this.form.controls['category'].setValue(
                this.editTag.category ? this.editTag.category._id : ''
              );
              const initialColor = this.editTag.color
                ? this.colorOptions.find(
                    (color) => color.value === this.editTag.color
                  )
                : '';
              this.form.controls['color'].setValue(
                initialColor ? initialColor.value : ''
              );
              const event = { _id: this.editTag.category._id };
              this.getProducts(event);
              const productIds = this.editTag.products;
              this.form.controls['product'].setValue(
                productIds ? productIds : ''
              );
              this.croppedImage = environment.apiUrl + this.editTag.iconimg;
              this.croppedBatchImage = environment.apiUrl + this.editTag.batchimg;
              console.log(
                this.croppedBatchImage,
                'this is cropped image for edit...'
              );
            });
        });
      }
    }
  }

  ngOnInit(): void {
    this.apiService
      .CommonApi(
        Apiconfig.productcatgory.method,
        Apiconfig.productcatgory.url,
        {}
      )
      .subscribe(
        (result) => {
          console.log(result, 'category fetch for me ............');
          if (result && result.status == 1) {
            this.store.categoryList.next(result.list ? result.list : []);
            this.categorylist = result.list ? result.list : [];
            this.rcategorylist = result.list ? result.list : [];
            console.log(this.rcategorylist, 'rcategoryy');
            this.categoryOptions = this.categorylist;
            this.cd.detectChanges();
          }
        },
        (error) => {
          console.log('error', error);
        }
      );

    this.getdata();

    if (this.viewpage) {
      console.log('this is view pagee.....');
    }
  }

  name = 'Angular';
  message = '';
  showEmojiPicker = false;
  sets = [
    'native',
    'google',
    'twitter',
    'facebook',
    'emojione',
    'apple',
    'messenger',
  ];
  set = 'twitter';
  toggleEmojiPicker() {
    console.log(this.showEmojiPicker);
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event) {
    // this.showEmojiPicker = false;
  }

  getProducts(event: any) {
    console.log(event);
    this.form.controls['product'].setValue('');
    // this.apiService.CommonApi(Apiconfig.prid);
     this.tag_url =  `/category/${event.slug}`
    const data = { rcat: event._id };
    this.apiService
      .CommonApi(Apiconfig.productList.method, Apiconfig.productList.url, data)
      .subscribe(
        (result) => {
          if (result) {
            this.productlist = result[0] ? result[0] : [];
            this.productOptions = this.productlist;
            // this.form.controls['product'].setValue(this.productOptions?this.productOptions:'');
            this.cd.detectChanges();
          }
        },
        (error) => {
          console.log('error', error);
        }
      );
  }

  getaddresscomponents(
    address_components: any,
    component,
    type: string[]
  ): any {
    var element = '';
    for (let i = 0; i < address_components.length; i++) {
      if (address_components[i].types[0] == type[0]) {
        element =
          component == 'short'
            ? address_components[i].short_name
            : address_components[i].long_name;
      }
    }
    return element;
  }

  fileoploadclick() {
    let profileimg = <HTMLElement>document.querySelector('.file-upload');
    profileimg.click();
  }
  fileoploadbatchclick() {
    let profileimg = <HTMLElement>document.querySelector('.file-upload-batch');
    profileimg.click();
  }
  coverimageClick() {
    let profileimg = <HTMLElement>document.querySelector('.cover-file-upload');
    profileimg.click();
  }

  fileChangeEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      console.log(event, 'file event changed....');
      // if (event.target.files[0].size <= 1024 * 1024 * 2) {
      if (
        event.target.files[0].type == 'image/jpeg' ||
        event.target.files[0].type == 'image/png' ||
        event.target.files[0].type == 'image/jpg' ||
        event.target.files[0].type == 'image/webp'
      ) {
        this.userimageChangedEvent = event;
        this.getBase64(event.target.files[0]).then((data: any) => {
          console.log(data, 'data123');
          this.croppedImage = data;
        });
      } else {
        this.notifyService.showError(
          'Photo only allows file types of PNG, JPG , WEBP and JPEG '
        );
      }
      // } else {
      //   this.notifyService.showError('The file size can not exceed 2MiB.');
      // }
    }
  }
  fileChangeBatchEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      console.log(event, 'file event changed....');
      // if (event.target.files[0].size <= 1024 * 1024 * 2) {
      if (
        event.target.files[0].type == 'image/jpeg' ||
        event.target.files[0].type == 'image/png' ||
        event.target.files[0].type == 'image/jpg' ||
        event.target.files[0].type == 'image/webp'
      ) {
        this.batchimageChangedEvent = event;
        this.getBase64(event.target.files[0]).then((data: any) => {
          console.log(data, 'data123');
          this.croppedBatchImage = data;
        });
      } else {
        this.notifyService.showError(
          'Photo only allows file types of PNG, JPG , WEBP and JPEG '
        );
      }
      // } else {
      //   this.notifyService.showError('The file size can not exceed 2MiB.');
      // }
    }
  }

  // imageCropped(event: ImageCroppedEvent) {
  //   console.log(event);
  //   this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(event.objectUrl || event.base64 || '');
  //   console.log(event);
  //   console.log(event.base64, 'this is that');
  //   console.log(this.croppedImage.base64, 'this is croppedImage');
  //   this.usercroppedImage = event.base64;
  //   // this.userfinalImage = this.dataURLtoFile(event.base64, 'userimage.png');
  // }

  coverFileChangeEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      // if (event.target.files[0].size <= 1024 * 1024 * 2) {
      if (
        event.target.files[0].type == 'image/jpeg' ||
        event.target.files[0].type == 'image/png' ||
        event.target.files[0].type == 'image/jpg'
      ) {
        this.coverimageChangedEvent = event;
      } else {
        this.notifyService.showError(
          'Photo only allows file types of PNG, JPG and JPEG '
        );
      }
      // } else {
      //   this.notifyService.showError('The file size can not exceed 2MiB.');
      // }
    }
  }

  imageCroppedCover(event: ImageCroppedEvent) {
    this.coverCroppedImage = event.base64;
    this.coverfinalImage = this.dataURLtoFile(event.base64, 'coverimage.png');
  }

  removeImage() {
    this.removerPhoto = true;
    this.usercroppedImage = 'assets/image/user.jpg';
    this.croppedImage = '';
  }
  removeBatchImage() {
    this.removerPhoto = true;
    this.usercroppedBatchImage = 'assets/image/user.jpg';
    this.croppedBatchImage = '';
  }

  dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  onFormSubmit(tagAddEditForm: UntypedFormGroup) {
    console.log(tagAddEditForm.value);
    if (!this.viewpage) {
      if (tagAddEditForm.valid) {
        this.submitebtn = true;
        // let formData = new FormData();
        var data = tagAddEditForm.value;
        this.userDetails = tagAddEditForm.value;
        console.log('form submission started...', this.userDetails);

        const formData = new FormData();
        //  let tagurl = this.tag_url
        // Append other form data
        formData.append('name', this.userDetails.first_name);
        // formData.append('tagUrl', tagurl);
        formData.append('status', this.userDetails.status);
        formData.append('address', this.userDetails.address);
        formData.append('number', this.userDetails.number);
        // formData.append('color', this.userDetails.color);

        const datas = {
          name: this.userDetails.first_name,
          status: this.userDetails.status,
          address: this.userDetails.address,
          number: this.userDetails.number,
        };


        this.apiService
          .CommonApi(Apiconfig.tagSave.method, Apiconfig.tagSave.url, datas)
          .subscribe((result) => {
            if (result.status !== 0) {
              this.router.navigate(['/app/tags/list']);
              this.notifyService.showSuccess(result.message);
            } else {
              this.notifyService.showError(result.message);
            }
            this.submitebtn = false;
          });
      } else {
        this.notifyService.showError('Please Enter all mandatory fields');
      }
    } else {
      if (tagAddEditForm.valid) {
        this.submitebtn = true;
        // let formData = new FormData();
        var data = tagAddEditForm.value;
        this.userDetails = tagAddEditForm.value;

        const formData = new FormData();

        const datas = {
          id: this.tagObjectId,
          name: this.userDetails.first_name,
          status: this.userDetails.status,
          address: this.userDetails.address,
          number: this.userDetails.number,
        };


        this.apiService
          .CommonApi(Apiconfig.tagEdit.method, Apiconfig.tagEdit.url, datas)
          .subscribe((result) => {
            if (result) {
              this.router.navigate(['/app/tags/list']);
              this.notifyService.showSuccess(result.message);
            } else {
              this.notifyService.showError(result.message);
            }
            this.submitebtn = false;
          });
      } else {
        this.notifyService.showError('Please Enter all mandatory fields');
      }
    }
  }

  imageCropPopout(template: TemplateRef<any>) {
    this.modalLogoutRef = this.modalService.show(template, {
      id: 1,
      class: 'logoutPop-model',
      ignoreBackdropClick: false,
    });
  }
  closeProductCrop() {
    // this.imageChangedEvent = null
    this.modalLogoutRef.hide();
  }

  base64ToBlob(base64, mime) {
    const sliceSize = 1024;
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mime });
  }

  onSelectedFile(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = [
        'image/jpg',
        'image/jpeg',
        'image/png',
        'image/JPG',
        'image/JPEG',
        'image/PNG',
      ];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError(
          'Please Select File Types of JPG, JPEG, PNG'
        );
        this.form.controls['image'].setValue('');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // console.log("image", img.width == 1349,  img.height)
          if (img.width < 1000 || img.height < 300) {
            this.notifyService.showError(
              'Image should be greater than 1000x300'
            );
            this.form.controls['image'].setValue('');
            return;
          }
          this.imageFile = file;
          this.preview = reader.result as string;
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // customizeProducts(event){
  //   this.productOptions = this.productOptions.filter(product =>
  //     !event.some(e => e._id === product._id)
  //   );
  // }

  tagNameCheck(event) {
    console.log(event, 'name change event');
    console.log(this.tagNameCheckerVal);
    if (this.tagNames.includes(this.tagNameCheckerVal)) {
      this.form.controls['first_name'].setErrors({ duplicateTagName: true });
    } else {
      this.form.controls['first_name'].setErrors(null);
    }
  }

  getdata() {
    this.apiService
      .CommonApi(Apiconfig.tagList.method, Apiconfig.tagList.url, {})
      .subscribe((response) => {
        console.log('+++++++++++++++++++++++');

        console.log(response);

        if (response && response.length > 0) {
          console.log(response, 'tag list....');
          response[0].forEach((element) => {
            this.tagNames.push(element.tagName);
          });

          console.log('these are the tagNames', this.tagNames);
        }
      });
  }
}
