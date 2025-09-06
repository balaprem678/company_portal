import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
// import { MapsAPILoader } from '@agm/core';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-city-warehouse',
  templateUrl: './city-warehouse.component.html',
  styleUrls: ['./city-warehouse.component.scss']
})
export class CityWarehouseComponent implements OnInit {
  @ViewChild('cityEditForm') form: NgForm;
  @ViewChild('search') searchElementRef: ElementRef;

  lat: any;
  lng: any;
  id: any;
  data: any;
  // geoCoder: google.maps.Geocoder;
  // place: google.maps.places.PlaceResult;
  zipcode: any;
  country: string;
  state: string;
  fulladdress: string;
  submitted: boolean = false;
  city: string;
  addressline1: string;

  constructor(private route: ActivatedRoute, private apiService: ApiService, private cd: ChangeDetectorRef,
    /* private mapsAPILoader: MapsAPILoader, */ private ngZone: NgZone, private notifyService: NotificationService,
    private router: Router) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.apiService.CommonApi(Apiconfig.editdoc.method, Apiconfig.editdoc.url, { id: this.id }).subscribe(result => {
        this.data = result;
        this.form.controls['midpoint'].setValue(this.data.warehouse.line1 ? this.data.warehouse.line1 : '');
        this.form.controls['fulladdress'].setValue(this.data.warehouse.fulladres ? this.data.warehouse.fulladres : '');
        this.form.controls['zipcode'].setValue(this.data.warehouse.zipcode ? this.data.warehouse.zipcode : '');
        this.form.controls['status'].setValue(this.data.status ? this.data.status : '');
        this.lat = this.data.warehouse ? this.data.warehouse.lat : this.lat;
        this.lng = this.data.warehouse ? this.data.warehouse.lng : this.lng;
        console.log(this.data);
        
        this.cd.detectChanges();
    });
      this.loadmap();
  }

  loadmap(){
    /* this.mapsAPILoader.load().then(() => {
      this.geoCoder = new google.maps.Geocoder;
      const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          //set latitude, longitude and zoom
          this.place = place;
          console.log(this.lat,this.lng)
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.fulladdress=place.formatted_address
          this.getAddress(this.lat, this.lng)
        });
      });
    }); */
  }

  getAddress(latitude, longitude) {
    /* this.geoCoder.geocode({ 'location': { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          // this.zoom = 12;
          var locationa = this.place;
          this.form.controls['fulladdress'].setValue(results[0].formatted_address)
          // this.fulladdress = results[0].formatted_address
          for (var i = 0; i < results[0].address_components.length; i++) {
            for (var j = 0; j < results[0].address_components[i].types.length; j++) {
              if (results[0].address_components[i].types[j] == 'postal_code') {
                this.form.controls['zipcode'].setValue(results[0].address_components[i].long_name)
                this.zipcode = results[0].address_components[i].long_name;
              }
              if (results[0].address_components[i].types[j] == 'country') {
                this.country = results[0].address_components[i].long_name;
              }
              if (results[0].address_components[i].types[j] == 'administrative_area_level_1' || results[0].address_components[i].types[j] == 'administrative_area_level_2') {
                this.state = results[0].address_components[i].long_name;;
              }
              if (results[0].address_components[i].types[j] == 'locality') {
                this.city = locationa.address_components[i].long_name;
              }
              if (results[0].address_components[i].types[j] == 'route') {
                if (this.addressline1 != locationa.address_components[i].long_name) {
                  if (this.addressline1 != '') {
                    this.addressline1 = locationa.address_components[i].long_name;
                  }
                }
              }
            }
          }
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    }); */
  }

  onSubmit(cityEditForm: UntypedFormGroup) {
    console.log(this.lat,this.lng)
    if (cityEditForm.valid) {
      this.submitted = true;
      var data = cityEditForm.value;
      const warehouse = {
        "city": this.city,
        "country": this.country,
        "fulladres": data.fulladdress,
        "lat": this.lat,
        "line1": this.fulladdress,
        "lng": this.lng,
        "state": this.state,
        "zipcode": data.zipcode
      }
      this.apiService.CommonApi(Apiconfig.warehouse.method, Apiconfig.warehouse.url, { data: warehouse, id: this.id }).subscribe((result) => {
        this.router.navigate(['/app/cityManagement/list']);
        this.notifyService.showSuccess("WareHouse Updated Successfully")
      })
    }
    else {
      this.notifyService.showError("Please Fill All Mandatory Details")
    }
  }

}
