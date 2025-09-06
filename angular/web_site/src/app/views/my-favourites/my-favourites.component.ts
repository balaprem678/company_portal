import { Component, OnInit } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-my-favourites',
  templateUrl: './my-favourites.component.html',
  styleUrls: ['./my-favourites.component.scss']
})
export class MyFavouritesComponent implements OnInit {
  userId: any;
  quantity_details: any = {};
  favoritList: any[] = [];
  removeAll: boolean = false;
  deleteWishlist = [];
  cartDetails: any;
  env_url: string = environment.apiUrl;

  cart_details: any[] = [];
  showfavourite: boolean = false;
  selectall: boolean = false;
  favitemlength: any
  selectedIndex: any;
  selectedItemId: any;
  selectionInfo: any;
  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
  ) {
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }
  }

  ngOnInit(): void {
    if (this.userId) {
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: this.userId }).subscribe(result => {
        if (result && result.status == 1) {
          this.favitemlength = result.data.length
          this.favoritList = result.data ? result.data : [];
           this.initializeSelectedPriceDetails()
          console.log("favoritList", this.favoritList)
          this.showfavourite = true;
        } else {
          this.showfavourite = true;
        }
      });
      // this.getCartDetails();
    }else{
    let userid = sessionStorage.getItem('serverKey');
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: userid,not_login:true }).subscribe(result => {
        if (result && result.status == 1) {
          this.favitemlength = result.data.length
          this.favoritList = result.data ? result.data : [];
          this.initializeSelectedPriceDetails()

          console.log("favoritList", this.favoritList)
          this.showfavourite = true;
        } else {
          this.showfavourite = true;
        }
      });
    }
    this.getCartDetails();
  }


  getPriceForChild(priceDetails: any[], chaild_id: string) {
    return priceDetails.find(detail => detail?.attributes?.some(attr => attr.chaild_id === chaild_id));
}

initializeSelectedPriceDetails(): void {
  console.log(this.favoritList, "favvvvvv");
  
  // Loop through the favorite items and match based on chaild_id
  this.favoritList.forEach(item => {
    if (item.product.price_details && item.product.price_details.length > 0) {
      // Find the price detail that matches the chaild_id
      const selectedPrice = item.product.price_details.find(price => 
        price.attributes.some(attr => attr.chaild_id === item.chaild_id)
      );
      
      // If a matching price is found, set it as the selected price
      if (selectedPrice) {
        item.selectedPriceDetail = selectedPrice;
      } else {
        // Fallback: set the first price detail if no match found
        item.selectedPriceDetail = item.product.price_details[0];
      }
    }
  });
}


// Method to check if the product and chaild_id in cart details match those in the favorites
isProductInCart(productId: string, chaildId: string): boolean {
  // Ensure cartDetails is an array
  if (Array.isArray(this.cartDetails)) {
    // Iterate over cart details
    return this.cartDetails.some(cartItem =>
      cartItem.id === productId && // Match product ID
      cartItem.variations.some(variation => 
        variation[0].chaild_id === chaildId // Match child ID within variations
      )
    );
  }
  return false; // Return false if cartDetails is not an array
}


// Method to check if the product exists in the favorites list with any chaild_id
isInFavorites(productId: string, chaildId: string): boolean {
  return this.favoritList.some(item =>
    item.product._id === productId
  );
}


onPriceDetailChange(item: any, selectedPriceDetail: any) {

  this.selectedIndex = item.price_details.findIndex(price => price === selectedPriceDetail);
  console.log(this.selectedIndex, 'ddddddselectedIndex');

  console.log(selectedPriceDetail, 'selectedPriceDetailselectedPriceDetail');
  console.log(item, 'itemmmm');
  this.selectionInfo.selectedIndex = this.selectedIndex || 0;
  this.selectionInfo.selectedAttributeId = selectedPriceDetail.attribute_ids[0];

  item.selectedPriceDetail = selectedPriceDetail;

  sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));

  item.selectedPriceDetail = selectedPriceDetail;


}







  getCartDetails() {
    console.log('^^^^^^^^^^^^^^^^')
    var data = {} as any;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.user_id = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey')
      console.log(serveykey,'daaaaaa');
      
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    data.schedule_type = 0;
    console.log(data,"daaaaaa");
    if (data.userId != '') {
      
      data.client_offset = (new Date).getTimezoneOffset();
      this.socketService.socketCall('r2e_cart_details', data).subscribe(response => {

        if (response.err == 0) {
          this.cartDetails = response.cartDetails;
          this.cart_details = this.cartDetails ? (this.cartDetails.cart_details && this.cartDetails.cart_details.length > 0 ? this.cartDetails.cart_details.map(e => { return e.id }) : []) : [];
          console.log(this.cart_details,this.cartDetails,"this.cart_details");
          this.store.cartdetails.next(this.cartDetails)
        }
      })
    }
    
  }

  productDetails(slug, id, rcat, scat) {
    this.route.navigate(['/products', slug], {
      relativeTo: this.activatedRoute,
      skipLocationChange: false,
      onSameUrlNavigation: "reload"
      // queryParams: {
      //   id: id,
      //   rcat: rcat,
      //   scat: scat
      // }
    })
  }






  preAddCart(product, selectedPriceDetail, action) {
    this.selectedItemId = product._id;

    // First, compare the chaild_id of the selected variant with the favorites list
    const matchingFavorite = this.favoritList.find(favItem => favItem.chaild_id == selectedPriceDetail.attribute_ids[0]);

    // If there's a match, remove the item from the favorites list
    if (matchingFavorite) {
        this.removeFromFavorites(matchingFavorite._id);  // Remove from favorites list
    }

    // Proceed to add to cart as usual
    if (typeof this.quantity_details.noquant == "undefined" || this.quantity_details.noquant == 0 || this.quantity_details.noquant == 1) {
        var noquant = 1;
        this.quantity_details = { ...this.quantity_details, noquant };
        this.addToCart(product, selectedPriceDetail, this.quantity_details);
    }
}


removeFromFavorites(favId: string) {
  this.apiService.CommonApi(Apiconfig.delteFavourite.method, Apiconfig.delteFavourite.url, { fav_id: favId })
      .subscribe(res => {
          if (res && res.status == 1) {
              this.notifyService.showSuccess('Added to Cart Successfully');
              // Update the list after removal
              this.ngOnInit();  // Reload favorites list
          } else {
              this.notifyService.showError(res.errors || 'Something went wrong');
          }
      });
}


addToCart(product,selectedPriceDetail, variant) {
    let data = {} as any;
    let attr: any = {};

    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcat_id;
    data.scat_id = product.scat_id;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    data.size_status = product.size_status;
     console.log(selectedPriceDetail,"sadasdasd");
     
    // Ensure you're using the selectedPriceDetail
    attr.attribute_ids = selectedPriceDetail.attribute_ids;
    attr.image = selectedPriceDetail.image;
    attr.mprice = selectedPriceDetail.mprice;
    attr.sprice = selectedPriceDetail.sprice;
    attr.sku = selectedPriceDetail.sku;
    attr.quantity = selectedPriceDetail.quantity;

    if (selectedPriceDetail.attributes && selectedPriceDetail.attributes.length > 0) {
        attr.attri_name = selectedPriceDetail.attributes[0].attri_name;
        attr.chaild_id = selectedPriceDetail.attributes[0].chaild_id;
        attr.chaild_name = selectedPriceDetail.attributes[0].chaild_name;
        attr.parrent_id = selectedPriceDetail.attributes[0].parrent_id;
    }

    data.variations = [[attr]];
    data.addons_quantity = variant.noquant;
    data.userId = '';

    if (this.userId) {
        data.userId = this.userId;
        data.type = 'cart';
    } else {
        let serveykey = sessionStorage.getItem('serverKey');
        if (serveykey) {
            data.userId = serveykey;
            data.type = 'temp_cart';
        }
    }

    if (data.userId != '') {
        this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
            if (result && result.err == 0) {
                this.getCartDetails();
                this.apiService.realoadFunction({ data: { page: 'register' } });
                this.ngOnInit();  // Reload component after adding item to cart
            } else {
                this.notifyService.showError(result.message || 'Something went wrong');
            }
        });
    }else{
      this.getCartDetails();
         
    }
}


  // addToCart(product) {
  //   console.log("product ^^^^^^^^^^^^^^^", product)
  //   var data = {} as any;
  //   let attr: any = {};

  //   data.foodId = product._id;
  //   data.foodname = product.name;
  //   data.rcat_id = product.rcategory;
  //   data.scat_id = product.scategory;
  //   data.mprice = product.base_price;
  //   data.psprice = product.sale_price; ``
  //   data.size_status = product.size_status;
  //   // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
  //   data.addons_quantity = 1;
  //   data.userId = '';


  //   if (this.userId) {
  //     data.userId = this.userId;
  //     data.type = 'cart';
  //   } else {
  //     var serveykey = sessionStorage.getItem('serverKey')
  //     if (serveykey) {
  //       data.userId = serveykey;
  //       data.type = 'temp_cart';
  //     }
  //   }

  //   attr.attri_name = product.price_details[0].attributes[0].attri_name;
  //   attr.chaild_id = product.price_details[0].attributes[0].chaild_id;
  //   attr.chaild_name = product.price_details[0].attributes[0].chaild_name;
  //   attr.parrent_id = product.price_details[0].attributes[0].parrent_id;


  //   data.variations = [[attr]];

  //   console.log(data, 'favv data');

  //   if (data.userId != '') {
  //     this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
  //       console.log(result, 'add to cart resuktl');

  //       if (result && result.err == 0) {
  //         this.route.navigate(['/cart']);
  //         var data = {
  //           page: 'register'
  //         }
  //         this.apiService.realoadFunction({ data: data });
  //       }
  //     })
  //   }
  // }


  formatNameWithVariants(name: string, variations: any[]): string {
    const variantNames = variations.flat().map(variant => variant.chaild_name);
    const formattedVariants = variantNames.join(', ');
    return `${name} (${formattedVariants})`;
  }

  

  // selectAllWish(value) {
  //   if (value) {
  //     this.deleteWishlist = [];
  //     this.deleteWishlist = this.favoritList.map(i => i._id)
  //     this.removeAll = true;
  //   } else {
  //     this.deleteWishlist = [];
  //     this.removeAll = false;
  //   }
  // }
  // selectAllWish(event: Event) {
  //   const target = event.target as HTMLInputElement;
  //   if (target.checked) {
  //     this.deleteWishlist = this.favoritList.map(item => item._id);
  //     this.removeAll = true;
  //   } else {
  //     this.deleteWishlist = [];
  //     this.removeAll = false;
  //   }
  // }
  selectAllWish(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.deleteWishlist = this.favoritList.map(item => item._id);
    } else {
      this.deleteWishlist = [];
    }
  }


  selectSignle(id, event) {
    if (this.deleteWishlist.length > 0) {
      const findIndex = this.deleteWishlist.indexOf(id);
      if (findIndex == -1) {
        this.deleteWishlist.push(id);
        this.removeAll = true;
      } else {
        this.removeAll = true;
        this.deleteWishlist.splice(findIndex, 1);
        if (this.deleteWishlist.length == 0) {
          this.removeAll = false;
        }
      }
    } else {
      if (id) {
        const findIndex = this.deleteWishlist.indexOf(id);
        if (findIndex == -1) {
          this.deleteWishlist.push(id);
          this.removeAll = true;
        } else {
          this.removeAll = true;
          this.deleteWishlist.splice(findIndex, 1);
          if (this.deleteWishlist.length == 0) {
            this.removeAll = false;
          }
        }
      } else {
        this.deleteWishlist = [];
        this.removeAll = false;
      }
    }
  }

  removeAllWish() {
    if (this.deleteWishlist.length > 0) {
      this.apiService.CommonApi(Apiconfig.multipleDeleteFavo.method, Apiconfig.multipleDeleteFavo.url, { docId: this.deleteWishlist }).subscribe(res => {
        if (res && res.status == 1) {
          this.notifyService.showSuccess('Removed from favourite');
          this.deleteWishlist = []//after removing from the wishlist we want to empty it 
          this.ngOnInit();
        } else {
          this.notifyService.showError(res.errors || 'Something went wrong')
        }
      })
    } else {
      this.notifyService.showError('Please select any one favourite');
      this.removeAll = false;
    }
  }

  singleDelete(id) {
    if (id) {
      this.apiService.CommonApi(Apiconfig.delteFavourite.method, Apiconfig.delteFavourite.url, { fav_id: id }).subscribe(res => {
        if (res && res.status == 1) {
          this.ngOnInit();
          this.notifyService.showSuccess('Removed from favourite');
        } else {
          this.notifyService.showError(res.errors || 'something went wrong');
        }
      })
    }
  }

}
