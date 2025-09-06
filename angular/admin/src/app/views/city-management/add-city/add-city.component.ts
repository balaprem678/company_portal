import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';

@Component({
  selector: 'app-add-city',
  templateUrl: './add-city.component.html',
  styleUrls: ['./add-city.component.scss']
})
export class AddCityComponent implements OnInit {
  settings: any;
  showslug: boolean = false;
  slugValue: any;
  editSlugValue: any;
  private geoCoder;
  @ViewChild('cityEditForm') form: UntypedFormGroup;
  @ViewChild('search')
  public searchElementRef: ElementRef;
  lat: any;
  lng: any;
  coordinates: any = [];
  data: any;
  address: any = "";
  cityname: any = "";
  tax: any;
  id: any;
  editDetails: any;
  curentUser: any;
  userPrivilegeDetails: any;
  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private apiService: ApiService,
    private sanitized: DomSanitizer,
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
    // private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
    private socket: WebSocketService,
    private ActivatedRoute: ActivatedRoute,

  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    console.log(this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/cityManagement/add' || (split.length > 0 && split[2] == 'City Management ')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'City Management ');
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
  }

  ngOnInit(): void {
    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.cityEdit.method, Apiconfig.cityEdit.url, { id: this.id }).subscribe(response => {
        if (response) {
          this.loadMap()
          this.editDetails = response;
          this.address = this.editDetails.address;
          this.form.controls['midpoint'].setValue(this.editDetails.address)
          this.form.controls['cityname'].setValue(this.editDetails.cityname)
          this.form.controls['status'].setValue(this.editDetails.status)
          this.editSlugValue = this.editDetails.slug;
          this.slugValue = this.editDetails.slug;
          this.lat = this.editDetails.location.lat;
          this.lng = this.editDetails.location.lng;
          //  this.coordinates = this.editDetails.poly_test.coordinates[0]
          this.cd.detectChanges()
        }
      })
    }
    this.apiService.CommonApi(Apiconfig.getSubCatSetting.method, Apiconfig.getSubCatSetting.url, {}).subscribe(response => {
      if (response && response[0]) {
        this.settings = response[0].settings;
        this.cd.detectChanges()
      }
    })
    this.loadMap()
    this.socket.listen('r2e_get_location').subscribe((data) => {
      if (data.err == 0) {
        if (typeof data.result != 'undefined' && typeof data.result.address != 'undefined') {
          if (typeof data.result.address.country != 'undefined') {
            var country = data.result.address.country;
            this.socket.emit('r2e_check_tax_available', { country: country });
            this.socket.listen('r2e_check_tax_available').subscribe((response) => {
              if (typeof response.err != 'undefined' && response.err == 0) {
                if (typeof response.is_available != 'undefined') {
                  this.tax = response
                }
              }
            })
          }
        }
      }
    })
  }

  editslug() {
    this.showslug = this.showslug ? false : true;
    if (!this.showslug) {
      this.slugValue = this.editSlugValue
    }
  }

  loadMap() {
    /* this.mapsAPILoader.load().then(() => {
      this.geoCoder = new google.maps.Geocoder;
      if (this.lat && this.lng) {
        this.map_polygon();
      }
      const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();
          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          //set latitude, longitude and zoom
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.map_polygon();
          this.getAddress(this.lat, this.lng)
        });
      });
    }); */
  }


  onSubmit(cityEditForm: UntypedFormGroup) {
    var time_to_pick = new Date();
    var data;
    if (this.editDetails && !this.coordinates[0] && this.lat == this.editDetails.location.lat && this.lng == this.editDetails.location.lng) {
      this.coordinates = this.editDetails.poly_test.coordinates[0];
    }
    if (this.coordinates[0] && cityEditForm.status != "INVALID") {
      if (this.id) {
        data = this.editDetails;
        data.address = this.address;
        data.cityname = cityEditForm.value.cityname;
        data.end_time = time_to_pick;
        data.extra_end_time = time_to_pick;
        data.extra_start_time = time_to_pick;
        data.start_time = time_to_pick;
        data.slug = this.slugValue;
        data.status = cityEditForm.value.status;
        data.location = { lng: this.lng, lat: this.lat };
        data.poly_test.coordinates[0] = this.coordinates;
        data.tax.tax_amount = this.tax ? this.tax.amount : this.editDetails.tax.tax_amount;
        data.tax.tax_id = this.tax ? this.tax.taxid : this.editDetails.tax.tax_id;
        data.tax.tax_label = this.tax ? this.tax.tax_label : this.editDetails.tax.tax_label;
      } else {
        data = {
          address: this.address,
          cityname: cityEditForm.value.cityname,
          end_time: time_to_pick,
          extra_end_time: time_to_pick,
          extra_start_time: time_to_pick,
          start_time: time_to_pick,
          slug: this.slugValue,
          status: cityEditForm.value.status,
          tax: {
            tax_amount: this.tax.amount,
            tax_id: this.tax.taxid,
            tax_label: this.tax.tax_label
          }
        }
      }
      var details = {
        corners: this.coordinates,
        lat: this.lat,
        lng: this.lng,
        data: data
      }
      this.apiService.CommonApi(Apiconfig.cityAdd.method, Apiconfig.cityAdd.url, details).subscribe(response => {
        if (response.code == 11000) {
          this.notifyService.showError((response.keyValue.slug ? "City slug" : response.keyValue) + " already exists.");
          return;
        }
        if (response.nModified > 0) {
          this.router.navigate(['/app/cityManagement/list']);
          this.notifyService.showSuccess("Updated successfully.");
        } else {
          this.notifyService.showError(response.message);
        }
      }, (error) => {
        this.notifyService.showError(error);
      })
    } else {
      if (cityEditForm.status == "INVALID") {
        this.notifyService.showError("Please fill all details.");
      } else if (!this.coordinates || !this.coordinates[0]) {
        this.notifyService.showError("Please draw the region.");
      }
    }

  }

  map_polygon() {
    /* var myOptions = {
      zoom: 11,
      center: new google.maps.LatLng(this.lat, this.lng),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById('Gmap'), myOptions);

    var corners = [];
    var t = '';
    var d = 10;
    var coordinatesArr = [];
    for (var i = 1; i <= 16; i++) {
      var angle = 22.5 * i;
      // var R = 6378.14;
      var R = 31890.14;
      // var R = 25512.14;
      var latitude1 = this.lat * (3.1415926535898 / 180);
      var longitude1 = this.lng * (3.1415926535898 / 180);
      var brng = angle * (3.1415926535898 / 180);
      var latitude2 = Math.asin(Math.sin(latitude1) * Math.cos(d / R) + Math.cos(latitude1) * Math.sin(d / R) * Math.cos(brng));
      var longitude2 = longitude1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(latitude1), Math.cos(d / R) - Math.sin(latitude1) * Math.sin(latitude2));
      latitude2 = latitude2 * (180 / 3.1415926535898);
      longitude2 = longitude2 * (180 / 3.1415926535898);
      corners.push(latitude2, longitude2);
    }
    if (this.id && this.editDetails && this.lat == this.editDetails.location.lat && this.lng == this.editDetails.location.lng) {
      corners = [];
      var coord = this.editDetails.poly_test.coordinates[0]
      for (let index = 0; index < coord.length; index++) {
        corners.push(new google.maps.LatLng(coord[index][1], coord[index][0]))
      }
    } else {
      corners = [
        new google.maps.LatLng(corners[0], corners[1]),
        new google.maps.LatLng(corners[4], corners[5]),
        new google.maps.LatLng(corners[8], corners[9]),
        new google.maps.LatLng(corners[12], corners[13]),
        new google.maps.LatLng(corners[16], corners[17]),
        new google.maps.LatLng(corners[20], corners[21]),
        new google.maps.LatLng(corners[24], corners[25]),
        new google.maps.LatLng(corners[28], corners[29]),
      ];
    }


    var myPolygon = new google.maps.Polygon({
      paths: corners,
      draggable: true,
      editable: true,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35
    });
    var final_cordi
    myPolygon.setMap(map);
    google.maps.event.addListener(myPolygon.getPath(), "set_at", () => {
      var coordi = [], htmlStr = []
      var len = myPolygon.getPath().getLength();
      coordi.push([
        parseFloat(myPolygon.getPath().getAt(0).toUrlValue(9).split(',')[1]),
        parseFloat(myPolygon.getPath().getAt(0).toUrlValue(9).split(',')[0])
      ])

      for (var i = 0; i < len; i++) {
        htmlStr.push([
          parseFloat(myPolygon.getPath().getAt(i).toUrlValue(9).split(',')[1]),
          parseFloat(myPolygon.getPath().getAt(i).toUrlValue(9).split(',')[0])
        ])
      }
      final_cordi = htmlStr.concat(coordi);
      this.coordinates = final_cordi
    }); */

  }


  getAddress(latitude, longitude) {
    this.geoCoder.geocode({ 'location': { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          this.socket.emit('r2e_get_location', { lat: this.lat, lon: this.lng })
          for (let index = 0; index < results.length; index++) {
            if (results[index].types[0] == "locality" && results[index].types[1] == "political") {
              this.address = results[index].formatted_address;
              this.cityname = results[index].address_components[0].long_name
              this.form.controls['cityname'].setValue(this.cityname)
              return
            }
          }
          // this.agm_address['formatted_address'] = results[0].formatted_address;
        } else {
          window.alert('No results found');
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    });
  }





}
