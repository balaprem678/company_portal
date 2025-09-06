import { Component, OnInit, TemplateRef,ViewChild } from '@angular/core';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule,NgForm } from '@angular/forms';
import { NotificationService } from 'src/app/_services/notification.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { environment } from 'src/environments/environment';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-add-edit-testimonial',
  templateUrl: './add-edit-testimonial.component.html',
  styleUrls: ['./add-edit-testimonial.component.scss']
})
export class AddEditTestimonialComponent {
  //testimonialManagement
  @ViewChild('testimonialForm') testimonialForm: NgForm;
  statusOptions = [
    // { label: 'Select Status', value: '' },
    { name: 'Active', id: 1 },
    { name: 'Inactive', id: 2 }
  ];
  routerurl: any
  submitted: boolean = false;
  selectedStatus: any = 1;
  documentTypeOptions: string[] = ['RC', 'Insurance', 'Pollution', 'Other'];
  documentType: string = '';
  documentFile: File | null = null;
  
  preview: string = '';
  imageFile: any;
  id:any
  gettestimonial : any

constructor( private router: Router, private notifyService: NotificationService,
  private route: ActivatedRoute, private apiService: ApiService, private modalService: BsModalService,
  private sanitizer: DomSanitizer){
    this.id = this.route.snapshot.paramMap.get('id')
    // /getTestimonialManagement

    if(this.id){
      this.apiService
      .CommonApi(Apiconfig.getTestimonialManagement.method, Apiconfig.getTestimonialManagement.url, {_id : this.id})
      .subscribe((res) => {
  console.log(res,"outputtttttttttttttttttttt");
             this.gettestimonial = res.data.doc
             this.testimonialForm.form.controls['name'].setValue(this.gettestimonial.name)
             this.testimonialForm.form.controls['location'].setValue(this.gettestimonial.location)
             this.testimonialForm.form.controls['rating'].setValue(this.gettestimonial.rating)
             this.testimonialForm.form.controls['information'].setValue(this.gettestimonial.description)
            //  this.testimonialForm.form.controls['category'].setValue(this.getBanners.category)
            //  const event = { _id: this.getBanners.category };
            //  this.testimonialForm.form.controls['products'].setValue(this.getBanners.products)
             this.selectedStatus = this.gettestimonial.status
             this.preview = environment.apiUrl + this.gettestimonial.image
            //  this.imageFile = this.getBanners.image
             
      })
    }

}
onSelectedFile(event) {
  if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg','image/webp', 'image/png', 'image/JPG', 'image.JPEG', 'image.PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
          this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
          this.testimonialForm.controls['image'].setValue('');
          return;
      }

      const reader = new FileReader();
      reader.onload = () => {
          const img = new Image();
          img.onload = () => {

              this.imageFile = file;
              this.preview = reader.result as string;
          };
          img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
  }
}
onDocumentSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.documentFile = file;
    }
  }


  submitForm(form: NgForm): void {
    this.submitted = true;
    if (form.valid) {
      const formData = new FormData();
      if (this.id) formData.append('_id', this.id);

      // Append all fields from the form
      formData.append('vehicleName', form.value.vehicleName);
      formData.append('cubicCapacity', form.value.cubicCapacity);
      formData.append('registrationNo', form.value.registrationNo);
      formData.append('colour', form.value.colour);
      formData.append('insuranceNo', form.value.insuranceNo);
      formData.append('seatingCapacity', form.value.seatingCapacity);
      formData.append('monthYrOf', form.value.monthYrOf);
      formData.append('nextPassingDue', form.value.nextPassingDue);
      formData.append('makersName', form.value.makersName);
      formData.append('documentType', this.documentType);
      if (this.documentFile) formData.append('document', this.documentFile);

      this.apiService.CommonApi(Apiconfig.testimonialManagement.method, Apiconfig.testimonialManagement.url, formData)
        .subscribe((res) => {
          if (res && res.status === 1) {
            this.notifyService.showSuccess(this.id ? "Updated successfully" : "Created successfully");
            this.router.navigate(['/app/asset/list']);
          } else {
            this.notifyService.showError(res.message || 'An error occurred.');
          }
        });
    } else {
      this.notifyService.showError("Please fill all required fields correctly.");
    }
  }

onStatusChange(event: any) {
  this.selectedStatus = event;
}
// submitForm(form: any) {
//   this.submitted = true
//   //  let newform =  this.offermanagement.value
//   // let newurl =  `/products/${this.selectedProductSlug}`
//   console.log(form.value,"form.value");
//   // return
//   if (form.valid) {
//     const formData = new FormData();
//     if ((this.imageFile == undefined || this.imageFile == null || this.imageFile == '' || this.imageFile == 'undefined') && !this.preview) {
//       return this.notifyService.showError("Image is required")
//     }
//     if (this.selectedStatus == undefined || this.selectedStatus == null || this.selectedStatus == '' || this.selectedStatus == 'undefined') {
//       return this.notifyService.showError("Status is required")
//     }
//     if (this.id) {
//       formData.append('_id', this.id);
//     }
//     formData.append('name', form.value.name);
//     formData.append('position', form.value.position);
//     formData.append('company_name', form.value.company_name);
//     formData.append('description', form.value.information);
//     formData.append('image', this.imageFile);
//     formData.append('status', this.selectedStatus);
//     // return
//     this.apiService
//       .CommonApi(Apiconfig.testimonialManagement.method, Apiconfig.testimonialManagement.url, formData)
//       .subscribe((res) => {
//         if (res && res.status == 1) {
//           if(this.id){
//             this.notifyService.showSuccess("Updated successfully")
//           }else{
//             this.notifyService.showSuccess("Created successfully")
//           }
//           this.router.navigate(['/app/testimonial/list'])
//         } else {
//           console.error(res.message);
//         }

//       });
//   }

// }



// submitForm(form: NgForm) {
//   this.submitted = true;
//   if (form.valid) {
//       const formData = new FormData();
//       // if (!this.preview && (!this.imageFile || this.imageFile === 'undefined')) {
//       //     return this.notifyService.showError("Image is optional, but you may upload one if desired.");
//       // }
//       if (!this.selectedStatus) {
//           return this.notifyService.showError("Status is required");
//       }
      
//       if (this.id) formData.append('_id', this.id);
      
//       formData.append('name', form.value.name);
//       formData.append('location', form.value.location);
//       formData.append('rating', form.value.rating);
//       formData.append('description', form.value.information);
//       if (this.imageFile) formData.append('image', this.imageFile);
//       formData.append('status', this.selectedStatus);

//       this.apiService.CommonApi(Apiconfig.testimonialManagement.method, Apiconfig.testimonialManagement.url, formData)
//           .subscribe((res) => {
//               if (res && res.status === 1) {
//                   this.notifyService.showSuccess(this.id ? "Updated successfully" : "Created successfully");
//                   this.router.navigate(['/app/testimonial/list']);
//               } else {
//                   console.error(res.message);
//               }
//           });
//   }
// }

cancel(){
  this.router.navigate(['/app/testimonial/list'])
}

}
