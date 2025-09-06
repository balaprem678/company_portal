import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-city-fare',
  templateUrl: './city-fare.component.html',
  styleUrls: ['./city-fare.component.scss']
})
export class CityFareComponent implements OnInit {
  pageTitle: String = "Add Fare";
  fareform: any;
  submitted: boolean = false;
  id: String;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private fb: UntypedFormBuilder,
    private notifyService: NotificationService
  ) {
    this.fareform = this.fb.group({
      cityname: ['', Validators.required],
      default_amt: [' ', [Validators.required, Validators.max(9999), Validators.min(1)]],
      target_amount: ['', [Validators.required, Validators.max(9999), Validators.min(1)]],
      format: ['', Validators.required,],
      minimum_distance: ['', [Validators.required, Validators.max(9999), Validators.min(1)]],
      extra_price: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.editcityfare.method, Apiconfig.editcityfare.url, { id: this.id }).subscribe(result => {
        if (result.length > 0 && result[0] != " ") {
          this.fareform.controls.cityname.setValue(result[0].cityname);
          this.fareform.controls.default_amt.setValue(result[0].delivery_charge.default_amt);
          this.fareform.controls.target_amount.setValue(result[0].delivery_charge.target_amount);
          this.fareform.controls.format.setValue(result[0].format);
          this.fareform.controls.minimum_distance.setValue(result[0].minimum_distance);
          this.fareform.controls.extra_price.setValue(result[0].extra_price);

        }
      })
    }
  }

  get formcontrol() {
    return this.fareform.controls;
  }

  onSubmit() {
    this.submitted = true;
    console.log(this.fareform)
    if (this.fareform.valid) {
      var data = { _id: '' };
      data = this.fareform.value;
      data._id = this.id.toString();
      this.apiService.CommonApi(Apiconfig.addcityfare.method, Apiconfig.addcityfare.url, data).subscribe(result => {
        this.submitted = false;
        if (result.status === 1) {
          this.notifyService.showSuccess(result.message)
          this.router.navigate(['/app/cityManagement/list'])
        } else {
          this.notifyService.showSuccess(result.message)
        }
      });
    }else {
      this.notifyService.showError("Please fill all mandetary fields.")
    }
  }
}
