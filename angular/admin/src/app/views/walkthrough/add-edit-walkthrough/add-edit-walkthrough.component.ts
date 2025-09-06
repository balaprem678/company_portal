import { Component, OnInit, TemplateRef } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { NotificationService } from 'src/app/_services/notification.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { environment } from 'src/environments/environment';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-add-edit-walkthrough',
  templateUrl: './add-edit-walkthrough.component.html',
  styleUrls: ['./add-edit-walkthrough.component.scss']
})
export class AddEditWalkthroughComponent implements OnInit {
  imageChangedEvent: Event | null = null;
  croppedImage: SafeUrl = '';
  id: any;
  modalLogoutRef: BsModalRef;
  walkthroughform: any;
  submitted: boolean = false;
  imageFile: any;
  preview: any;
  status: any = "";
  letters: any
  charLeft: any = 30;
  statusOptions = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 2 }
  ];
  selectedStatus: string = '';

  constructor(private fb: UntypedFormBuilder, private router: Router, private notifyService: NotificationService,
    private route: ActivatedRoute, private apiService: ApiService, private modalService: BsModalService,
    private sanitizer: DomSanitizer) { }
  ngOnInit(): void {
    this.walkthroughform = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      status: ['', Validators.required],
      image: [''],
    });
    this.id = this.route.snapshot.paramMap.get('id')
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.walkthroughEdit.method, Apiconfig.walkthroughEdit.url, { id: this.id }).subscribe(result => {
        if (result) {
          console.log(result, 'this is the result');

          this.walkthroughform.controls.title.setValue(result[0].title)
          this.walkthroughform.controls.description.setValue(result[0].description)
          // this.walkthroughform.controls.banner_category.setValue(result[0].category)
          this.walkthroughform.controls.status.setValue(result[0].status)
          // this.currentCategory=result[0].category
          // console.log(this.currentCategory);

          this.preview = environment.apiUrl + result[0].img
        }
      })
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.walkthroughform.valid) {
      const formData = new FormData();
      if (this.id) {
        formData.append('_id', this.id);
      }
      formData.append('title', this.walkthroughform.get('title').value);
      formData.append('description', this.walkthroughform.get('description').value);
      formData.append("status", this.walkthroughform.get('status').value)
      formData.append('img', this.imageFile);
      this.apiService.CommonApi(Apiconfig.addWalkthrough.method, Apiconfig.addWalkthrough.url, formData).subscribe(result => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message)
          this.router.navigate(['/app/walkthrough_images/list'])
        }
        else {
          this.notifyService.showError(result.message)
        }
      })
    }
  }

  get formcontrol() {
    return this.walkthroughform.controls;
  }

  

  onSelectedFile(event) {
    this.imageChangedEvent = event
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG,JPEG,PNG');
        this.walkthroughform.controls['image'].setValue('')
        return;
      }
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.preview = reader.result as string;
      }
      reader.readAsDataURL(file);
    }
  }

  charLeftFunc(letters) {
    this.charLeft = 30 - parseInt(letters.length)
  }
  imageCropped(event: ImageCroppedEvent) {
    console.log(event, "eventeventevent");
    this.preview = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    this.croppedImage = event.base64;
    console.log(this.croppedImage, 'cropped');

    console.log(this.preview, 'iiiasfsfsf');

    // const file = new File([event.blob], this.inputFile.name, { type: this.inputFile.type });
    // console.log(file, 'Converted File');
    // this.avatarImg = file;
  }

  imageLoaded(image: LoadedImage) {
    // display cropper tool
  }
  cropperReady() {
    /* cropper ready */
  }
  loadImageFailed() {
    /* show message */
  }

  closeProductCrop() {
    // this.imageChangedEvent = null
    this.modalLogoutRef.hide();
  }
  imageCropPopout(template: TemplateRef<any>) {
    this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: false })
  }

}
