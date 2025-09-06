import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditBannerComponent } from './add-edit-banner/add-edit-banner.component';
import { AddMobileBannerComponent } from './add-mobile-banner/add-mobile-banner.component';
import { BannersComponent } from './banners.component';
import { MobileBannerListComponent } from './mobile-banner-list/mobile-banner-list.component';
import { MobileListBannerComponent } from './mobile-list-banner/mobile-list-banner.component';
import { BannerTypesComponent } from './banner-types/banner-types.component';
import { BannerTypesListComponent } from './banner-types-list/banner-types-list.component';
import { BatchBannersComponent } from './batch-banners/batch-banners.component';
const routes: Routes = [{
  path: '',
  component: BannersComponent,
  children: [{
    path: 'web-add',
    component: AddEditBannerComponent,
    data: {
      title: 'Add Banner'
    }
  },
  {
    path: 'web-list',
    component: MobileListBannerComponent,
    data: {
      title: 'Banner Lists'
    }
  },
  {
    path: 'web-edit/:id',
    component: AddEditBannerComponent,
    data: {
      title: 'Web edit'
    }
  },
  {
    path: 'mobile-list',
    component: MobileBannerListComponent,
    data: {
      title: 'Mobile List'
    }
  },
  {
    path: 'mobile-banner-add',
    component: AddMobileBannerComponent,
    data: {
      title: 'Mobile Add'
    }
  },
  {
    path: 'header-1',
    component: BannerTypesComponent,
    data: {
      title: 'Header-1'
    }
  },
  {
    path: 'header-1/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Header-1'
    }
  },
  {
    path: 'header-2',
    component: BannerTypesComponent,
    data: {
      title: 'Header-2'
    }
  },
  {
    path: 'batchs',
    component: BatchBannersComponent,
    data: {
      title: 'Batchs'
    }
  },
  {
    path: 'batchs/:id',
    component: BatchBannersComponent,
    data: {
      title: 'Batchs'
    }
  },
  {
    path: 'header-2/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Header-2'
    }
  },
  {
    path: 'post-header-1',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Header-1'
    }
  },
  {
    path: 'post-header-1/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Header-1'
    }
  },
  {
    path: 'post-header-2',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Header-2'
    }
  },
  {
    path: 'post-header-2/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Header-2'
    }
  },
  {
    path: 'post-category-3',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Category-3'
    }
  },
  {
    path: 'post-category-3/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Category-3'
    }
  },
  {
    path: 'post-category-6',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Category-6'
    }
  },
  {
    path: 'post-category-6/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Post-Category-6'
    }
  },
  {
    path: 'pre-footer',
    component: BannerTypesComponent,
    data: {
      title: 'Pre-Footer'
    }
  },
  {
    path: 'pre-footer/:id',
    component: BannerTypesComponent,
    data: {
      title: 'Pre-Footer'
    }
  },
  {
    path: 'banner-types-list',
    component: BannerTypesListComponent,
    data: {
      title: 'Banner type list'
    }
  },
  // {
  //   path: 'banner-types-list',
  //   component: BannerTypesListComponent,
  //   data: {
  //     title: 'Banner Type List'
  //   }
  // },

  {
    path: 'mobile-banner-edit/:id',
    component: AddMobileBannerComponent,
    data: {
      title: 'Mobile Edit'
    }
  }, {
    path: '',
    redirectTo: 'banner-types-list',
    pathMatch: 'full'
  }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BannersRoutingModule { }
