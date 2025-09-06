import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CheckoutComponent } from './checkout/checkout.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { MyFavouritesComponent } from './my-favourites/my-favourites.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { ProductComponent } from './product/product.component';
import { ViewsComponent } from './views.component';
import { CardDetailsComponent } from './card-details/card-details.component';
import { ManageAddressComponent } from './manage-address/manage-address.component';
import { MyOrderComponent } from './my-order/my-order.component';
import { AuthGuard } from '../_helpers/auth.guard';
import { CategoryComponent } from './category/category.component';
import { SearchProductComponent } from './search-product/search-product.component';
import { NotFoundComponent } from '../not-found/not-found.component';
import { OffersComponent } from './offers/offers.component';
import { WishlistComponent } from './wishlist/wishlist.component';
import { LoginComponent } from './login/login.component';
import { ShippingPolicyComponent } from './shipping-policy/shipping-policy.component';
import { CancellationPolicyComponent } from './cancellation-policy/cancellation-policy.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions.component';
import { OurStoryComponent } from './our-story/our-story.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { FaqComponent } from './faq/faq.component';
import { ProductCatalogComponent } from './product-catalog/product-catalog.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ComboOffersComponent } from './combo-offers/combo-offers.component';
import { AuthCompelsoryGuard } from '../_helpers/authCompelsory.guard';
const routes: Routes = [
  {
    path: '',
    component: ViewsComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login',
    },
    // canActivate: [AuthGuard]
  },
  // {
  //     path: "my-account-page",
  //     component: MyAccountComponent,
  //     data: {
  //         title: 'My Account'
  //     },
  //     // canActivate: [AuthGuard]
  // },
  {
    path: 'my-account',
    component: MyAccountComponent,
    data: {
      title: 'My Account',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'edit-profile',
    component: MyAccountComponent,
    data: {
      title: 'Edit Profile',
    },
    canActivate: [AuthGuard],
  },
  {
    path: 'search',
    // component: ProductComponent,
    component: SearchProductComponent,
    data: {
      title: 'Product List',
    },
  },
  {
    path: 'category/:rcat',
    component: CategoryComponent,
    data: {
      title: 'Product List',
    },
  },
  {
    path: 'category',
    component: CategoryComponent,
    data: {
      title: 'Product List',
    },
  },
  {
    path: 'products/:slug',
    component: ProductDetailComponent,
    data: {
      title: 'Product Details',
    },
  },
  // {
  //   path: 'product-detail',
  //   component: ProductDetailComponent,
  //   data: {
  //     title: 'Product Details',
  //   },
  // },
  {
    path: 'my-wishlist',
    component: MyFavouritesComponent,
    data: {
      title: 'My Favourites',
    },
    // canActivate: [AuthGuard],
  },
  {
    path: 'manage-address',
    component: ManageAddressComponent,
    data: {
      title: 'Manage Address',
    },
    canActivate: [AuthGuard],
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    data: {
      title: 'My Checkout',
    },
    canActivate: [AuthGuard]
  },
  {
    path: 'cart',
    component: CardDetailsComponent,
    data: {
      title: 'Shopping Cart',
    },
  },
  {
    path: 'my-order',
    component: MyOrderComponent,
    data: {
      title: 'Orders',
    },
    canActivate: [AuthGuard],
  },
  {
    path: 'offers',
    component: OffersComponent,
    data: {
      title: 'Offers',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'combo-offer',
    component: ComboOffersComponent,
    data: {
      title: 'Combo-Offers',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'wishlist',
    component: WishlistComponent,
    data: {
      title: 'Wishlist',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'my-account-page',
    loadChildren: () =>
      import('./my-account-page/my-account-page.module').then(
        (m) => m.MyAccountPageModule
      ),
    data: {
      title: 'My Account',
    },
    canActivate: [AuthCompelsoryGuard]
  },
  {
    path: 'shipping-policy',
    component: ShippingPolicyComponent,
    data: {
      title: 'Shipping Policy',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'cancellation-policy',
    component: CancellationPolicyComponent,
    data: {
      title: 'Cancelation Policy',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
    data: {
      title: 'Privacy Policy',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'terms-and-conditions',
    component: TermsAndConditionsComponent,
    data: {
      title: 'Terms And Conditions',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'our-story',
    component: OurStoryComponent,
    data: {
      title: 'Our Story',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
    data: {
      title: 'Contact Us',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'faq',
    component: FaqComponent,
    data: {
      title: 'FAQ',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    data: {
      title: 'forgot-password',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'product-catalog',
    component: ProductCatalogComponent,
    data: {
      title: 'Product Catalog',
    },
    // canActivate: [AuthGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewsRoutingModule {}
