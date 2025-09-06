import { AgmInfoWindow, MapsAPILoader } from '@agm/core';
import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
// import { Position } from 'ngx-perfect-scrollbar';
import { Socket } from 'ngx-socket-io';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss']
})
export class MapViewComponent implements OnInit {
  lat: any;
  lng: any;
  radius: Number = 10;
  markers: any;
  imgUrl: any = environment.apiUrl;
  private geoCoder;
  address: any;
  zoom: any;
  onoff: any = "";
  type: any = "";
  totalCount: Number = 0;
  driverCount: Number = 0;
  @ViewChild('search')
  public searchElementRef: ElementRef;
  restaurantCount: Number = 0;
  usersCount: Number = 0;
  previousIW: AgmInfoWindow;
  currentIW: AgmInfoWindow;
  map: any;
  line: any;
  directionsService: any;
  SearchOrderId:any;
  submitted:boolean=false;
  origin:any;
  destination:any;
  waypoints:any;
  curentUser:any;
  userPrivilegeDetails:any;
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
    private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
    private webSocket:WebSocketService
  ) {
    this.getPosition().then((result) => {
      this.lat = result.lat;
      this.lng = result.lng;
      this.loadMap()
      var data = {
        lat: this.lat,
        lng: this.lng,
        radius: this.radius,
      }
      this.filter(data)

    })
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/mapview' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'mapview');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
      }
    }
  }

  ngOnInit(): void {
    this.webSocket.listen('r2e_get_admin_tracking_details').subscribe((data)=>{
      this.tracker(data)
      console.log(data);
      
    })
  }


  filter(data) {
    this.apiService.CommonApi(Apiconfig.beforeMapFilter.method, Apiconfig.beforeMapFilter.url, data).subscribe(
      (result) => {
        this.markers = result.list
        this.totalCount = result.driverCount + result.restaurantCount + result.usersCount;
        this.driverCount = result.driverCount;
        this.restaurantCount = result.restaurantCount;
        this.usersCount = result.usersCount;
      })
  }

  getPosition(): Promise<any> {
    return new Promise((resolve, reject) => {

      navigator.geolocation.getCurrentPosition(resp => {

        resolve({ lng: resp.coords.longitude, lat: resp.coords.latitude });
      },
        err => {
          reject(err);
        });
    });

  }
  loadMap() {
    this.mapsAPILoader.load().then(() => {
      this.geoCoder = new google.maps.Geocoder;
      this.getAddress(this.lat, this.lng)
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
          this.getAddress(this.lat, this.lng)
        });
      });
    });
  }



  getAddress(latitude, longitude) {
    this.geoCoder.geocode({ 'location': { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          if (!this.address) {
            this.address = results[0].formatted_address;
          }
          this.zoom = 10;
          // this.agm_address['formatted_address'] = results[0].formatted_address;
        } else {
          window.alert('No results found');
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    });


  }

  onSubmit() {
    var data = {
      lat: this.lat,
      lng: this.lng,
      radius: this.radius,
      taskerareaaddress: this.address,
      onoff: this.onoff,
      type: this.type
    }
    this.filter(data)
  }
  markerClick(infoWindow) {
    if (this.previousIW) {
      this.currentIW = infoWindow;
      this.previousIW.close();
    }
    this.previousIW = infoWindow;
  }

  viewProfile(role, id) {
    if (role == "driver") {
      this.router.navigate(['/app/drivers/driversview/' + id])
    } else if (role == 'user') {
      this.router.navigate(['/app/users/view/' + id])
    } else if (role == "restaurant") {

    }
  }

  onMapReady(map: any) {
    this.map = map;
    // this.calcRoute();
    // this.mockDirections();
    // this.initEvents();
  }

  orderId(){
    this.webSocket.emit('r2e_get_admin_tracking_details',{ orderId:this.SearchOrderId })
    this.submitted=true;
    
  }
  
  tracker(data){
    var orderDetails=data.tracking_details;
    if(typeof orderDetails != undefined && typeof orderDetails.location != undefined){
      if (typeof orderDetails.driver_image != 'undefined') {
        var img = document.createElement("img");
        img.onerror = function () {
         orderDetails.driver_image = "uploads/default/user.jpg"
        }
        img.src =orderDetails.driver_image;
      } else {
       orderDetails.driver_image = "uploads/default/user.jpg"
      }
      if (typeof orderDetails.user_image != 'undefined') {
        var img = document.createElement("img");
        img.onerror = function () {
         orderDetails.user_image = "uploads/default/user.jpg"
        }
        img.src =orderDetails.user_image;
      } else {
       orderDetails.user_image = "uploads/default/user.jpg"
      }
      this.origin=orderDetails.location;
      this.destination=orderDetails.user_location;
      this.waypoints = [
        //  {location: { lat: 39.0921167, lng: -94.8559005 }},
        //  {location: { lat: 41.8339037, lng: -87.8720468 }}
      ]
    }
  }
}


