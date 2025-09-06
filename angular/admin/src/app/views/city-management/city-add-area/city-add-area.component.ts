import { Component, OnInit, ChangeDetectorRef, ElementRef, NgZone, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
// import { MapsAPILoader } from '@agm/core';
import { NotificationService } from 'src/app/_services/notification.service';
import { threadId } from 'worker_threads';

@Component({
  selector: 'app-city-add-area',
  templateUrl: './city-add-area.component.html',
  styleUrls: ['./city-add-area.component.scss']
})
export class CityAddAreaComponent implements OnInit {

  @ViewChild('cityAreaFor') form: UntypedFormGroup;
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
  address: any;
  submitted: boolean = false;
  city: string;
  coordinates: any = [];

  constructor(private route: ActivatedRoute, private apiService: ApiService, private cd: ChangeDetectorRef,
    /* private mapsAPILoader: MapsAPILoader, */ private ngZone: NgZone, private notifyService: NotificationService,
    private router: Router) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.router.url.split('/')[3] == "editCity_area") {
      this.apiService.CommonApi(Apiconfig.editcityarea.method, Apiconfig.editcityarea.url, { id: this.id }).subscribe(result => {
        this.data = result[0];
        this.form.controls['midpoint'].setValue(this.data.address ? this.data.address : '');
        this.form.controls['fulladdress'].setValue(this.data.area_name ? this.data.area_name : '');
        this.form.controls['fulladdress']
        this.form.controls['status'].setValue(this.data.status ? this.data.status : '');
        this.lat = this.data.area_poly.coordinates[0][0][1];
        this.lng = this.data.area_poly.coordinates[0][0][0];
        this.address = this.data.address ? this.data.address : '';
        this.loadmap()
        this.cd.detectChanges();
      });
    }
    this.loadmap();
  }

  loadmap() {
    /* this.mapsAPILoader.load().then(() => {
      this.geoCoder = new google.maps.Geocoder;
      if (this.id && this.router.url.split('/')[3] == "editCity_area") {
        this.map_polygon()
      }
      const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          //set latitude, longitude and zoom
          this.place = place;
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.getAddress(this.lat, this.lng)
          this.map_polygon()
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
          for (let index = 0; index < results.length; index++) {
            if (results[index].types[2] == "sublocality_level_1" && results[index].types[1] == "sublocality" && results[index].types[0] == "political") {
              this.form.controls['fulladdress'].setValue(results[index].address_components[0].long_name)
              this.address = results[index].formatted_address;
              return
            }
          }
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    }); */
  }

  onSubmit(cityAreaForm: UntypedFormGroup) {
    if (this.data && !this.coordinates[0] && this.lat == this.data.area_poly.coordinates[0][0][1] && this.lng == this.data.area_poly.coordinates[0][0][0]) {
      this.coordinates = this.data.area_poly.coordinates[0];
    }
    var data = cityAreaForm.value;
    var details = {
      corners: this.coordinates,
      location: { lat: this.lat, lng: this.lng },
      data: {
        address: this.address,
        area_name: data.fulladdress,
        status: data.status,
        avatar: this.data ? this.data.avatar : '',
        _id: this.data ? this.data._id : "",
        area_poly: {
          coordinates: [this.coordinates],
          type: "Polygon"
        }
      },
      id: this.id
    }
    if (cityAreaForm.status != "INVALID" && this.coordinates[0] && data.fulladdress) {
      if (this.data && this.id) {
        this.apiService.CommonApi(Apiconfig.editSavecity_area.method, Apiconfig.editSavecity_area.url, details).subscribe(result => {
          if (result.nModified > 0) {
            this.router.navigate(['/app/cityManagement/city_area_list/', this.data.avatar]);
            this.notifyService.showSuccess("Updated successfully.");
          } else {
            this.notifyService.showError(result.message);
          }
        }, (error) => {
          this.notifyService.showError(error);
        })
      } else {
        this.apiService.CommonApi(Apiconfig.savecity_area.method, Apiconfig.savecity_area.url, details).subscribe(result => {
          if (result.nModified > 0) {
            this.router.navigate(['/app/cityManagement/city_area_list/', this.id]);
            this.notifyService.showSuccess("Updated successfully.");
          } else {
            this.notifyService.showError(result.message);
          }
        }, (error) => {
          this.notifyService.showError(error);
        })
      }

    } else {
      if (!this.coordinates || !this.coordinates[0]) {
        this.notifyService.showError("Please draw the region.");
      }else{
        this.notifyService.showError("Please Fill All Mandatory Details.");
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
    if (this.id && this.data && this.lat == this.data.area_poly.coordinates[0][0][1] && this.lng == this.data.area_poly.coordinates[0][0][0]) {
      corners = [];
      var coord = this.data.area_poly.coordinates[0]
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

}
