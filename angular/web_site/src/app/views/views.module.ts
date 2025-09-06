import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewsComponent } from './views.component';
// import { AgmCoreModule } from '@agm/core';
import { environment } from 'src/environments/environment';
import { MyAccountComponent } from './my-account/my-account.component';
import { ProductComponent } from './product/product.component';
import { ViewsRoutingModule } from './views-routing.module';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { RouterModule } from '@angular/router';
import { NgxIntlTelInputModule } from '@khazii/ngx-intl-tel-input';
import {
  NgbModule,
  NgbCarouselModule,
  NgbRatingModule,
} from '@ng-bootstrap/ng-bootstrap';
import { MyFavouritesComponent } from './my-favourites/my-favourites.component';
// import {IvyCarouselModule} from 'angular-responsive-carousel';
import { ArrayFilterPipe } from './array-filter.pipe';
import { InnerHtmlPipe } from './inner-html.pipe';
import { NgSelectModule } from '@ng-select/ng-select';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CheckoutComponent } from './checkout/checkout.component';
import { FilterPipe } from './filter.pipe';
import { SlickCarouselModule } from 'ngx-slick-carousel';
// import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { NgxSliderModule } from 'ngx-slider-v2';
import { CardDetailsComponent } from './card-details/card-details.component';
import { ManageAddressComponent } from './manage-address/manage-address.component';
import { MyOrderComponent } from './my-order/my-order.component';
import { SlideAmountComponent } from './product/slide-amount/slide-amount.component';
import { PaginationComponent } from './pagination/pagination.component';
import { CategoryPipePipe } from './category-pipe.pipe';
import { SizeFilterPipe } from './size-filter.pipe';
import { SharedModule } from '../shared/shared.module';
import { CategoryComponent } from './category/category.component';
import { SearchProductComponent } from './search-product/search-product.component';
import { Notfound404Component } from './notfound404/notfound404.component';
import { OffersComponent } from './offers/offers.component';
import { WishlistComponent } from './wishlist/wishlist.component';
import { MyAccountPageComponent } from './my-account-page/my-account-page.component';
import { ShippingPolicyComponent } from './shipping-policy/shipping-policy.component';
import { CancellationPolicyComponent } from './cancellation-policy/cancellation-policy.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions.component';
import { OurStoryComponent } from './our-story/our-story.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { FaqComponent } from './faq/faq.component';
import { ProductCatalogComponent } from './product-catalog/product-catalog.component';
import { SafeHtmlPipe } from '../../app/views/safe-html.pipe';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { NgxImageZoomModule } from 'ngx-image-zoom';
import { ComboOffersComponent } from './combo-offers/combo-offers.component';
@NgModule({
  declarations: [
    ViewsComponent,
    MyAccountComponent,
    ProductComponent,
    LoginComponent,
    RegisterComponent,
    ProductDetailComponent,
    MyFavouritesComponent,
    ArrayFilterPipe,
    InnerHtmlPipe,
    CheckoutComponent,
    FilterPipe,
    CardDetailsComponent,
    ManageAddressComponent,
    MyOrderComponent,
    SlideAmountComponent,
    PaginationComponent,
    CategoryPipePipe,
    SizeFilterPipe,
    CategoryComponent,
    SearchProductComponent,
    Notfound404Component,
    OffersComponent,
    WishlistComponent,
    MyAccountPageComponent,
    ShippingPolicyComponent,
    CancellationPolicyComponent,
    PrivacyPolicyComponent,
    TermsAndConditionsComponent,
    OurStoryComponent,
    ContactUsComponent,
    FaqComponent,
    ProductCatalogComponent,
    SafeHtmlPipe,
    ForgotPasswordComponent,
    ComboOffersComponent,
    
  ],
  imports: [
    CommonModule,
    RouterModule,
    ViewsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    ModalModule.forRoot(),
    BsDropdownModule.forRoot(),
    /* AgmCoreModule.forRoot({
      apiKey: environment.mapAPIKey,
      libraries: ['places']
    }), */
    NgxIntlTelInputModule,
    NgbModule,
    NgbCarouselModule,
    // IvyCarouselModule,
    NgSelectModule,
    TabsModule,
    SlickCarouselModule,
    // NgxSliderModule,
    NgxSliderModule,
    SharedModule,
    NgbRatingModule,
    NgxImageZoomModule
  ],
  exports: [LoginComponent, RegisterComponent, SlideAmountComponent],
})
export class ViewsModule {}
