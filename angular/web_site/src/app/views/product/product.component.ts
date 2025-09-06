import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { NgbTypeaheadWindow } from '@ng-bootstrap/ng-bootstrap/typeahead/typeahead-window';
// import { Options } from '@angular-slider/ngx-slider';
import { Options } from 'ngx-slider-v2';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';


@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss']
})
export class ProductComponent implements OnInit, AfterViewInit {
  sort_filter_value: any = "New arrivals"
  sort_arr: any[] = [

    {
      "label": "New arrivals",
      "value": "latest"
    },

    {
      "label": "Price: Low to High",
      "value": "lowtohigh"
    },
    {
      "label": "Price: High to Low",
      "value": "hightolow"
    },
    {
      "label": "Ratings: High to Low",
      "value": "rathightolow"
    },
    {
      "label": "Ratings: Low to High",
      "value": "ratlowtohigh"
    },
  ]

  // '', '', '', ''
  // sampleobj = {}


  // sampleobj: { [key: string]: any[] } = {};
  sampleobj = {};
  sub: any[] = []
  parent_list: any = [];
  selectedCategory: any = {};
  all_Subs: any[] = [];
  cityid: any;
  barands: any[] = [];
  category_sub: any[] = [];
  checkobx = {};
  subcheckbox = {};
  childcheckbox = {}
  variance_checkbox = {}
  brandidbox = {};
  selected_cats_children = {}
  pricebox = {};
  category: any[] = [];
  brandid: any[] = [];
  pricedtl: any[] = [];
  scat_array: any[] = [];
  queryData: any;
  pro_count: any;
  settings: any;
  filter_data: any;
  productList: any[] = [];
  final_child_arr: any[] = [];
  userId: string;
  active_slider: number = 0;
  skip: number = 0;
  limit: number = 40;
  slideConfig = {
    "slidesToShow": 5, "slidesToScroll": 3, "arrow": true, "dots": true, "responsive": [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
          dots: true
        }
      },
      {
        breakpoint: 800,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 700,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  minValue: number = 1000;
  maxValue: number = 50000;
  options: Options = {
    floor: 0,
    ceil: 53000,

    showTicks: true
  };
  expression: boolean = false;
  filterSize: any[] = [];
  recentlyVistProd: any[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 40;
  totalItems: number;
  faviroitList: any[] = [];
  cart_details: any[] = [];
  cartDetails: any;
  quantity_details: any = {};
  sort_filter: any;
  category_name: any[] = [];
  showproduct: boolean = false;
  id: any;
  modalRef: BsModalRef
  name_contorl: any;
  name_contorl_params: number;
  checkfalse: any;
  parent_checkfalse: any;
  child_arr: any;
  sample_arr: any[] = []
  tree = []
  select_subcat: any = [];
  variance: any;
  rating_filter: any;
  show_arr_value: number;
  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    private cdr: ChangeDetectorRef,
    config: NgbRatingConfig,
    private modalServices: ModalModalServiceService,

  ) {
    config.max = 5;
    this.store.generalSettings.subscribe(result => {
      this.settings = result;
    })

    this.apiService.reloadObservable$.subscribe(result => {
      var useStrg = localStorage.getItem('userId');
      if (useStrg) {
        this.userId = useStrg;
      }
    });

    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }

    // var storageLocal = JSON.parse(sessionStorage.getItem('searchLocation'));
    // if (storageLocal) {
    //   this.cityid = storageLocal.cityid;
    // };
    // this.apiService.CommonApi(Apiconfig.allBrands.method, Apiconfig.allBrands.url, {}).subscribe(result => {
    //   if (result && result.status == 1) {
    //     this.barands = result.brandlist
    //   }
    // })
    // this.apiService.CommonApi(Apiconfig.getMaxminPrice.method, Apiconfig.getMaxminPrice.url,{}).subscribe(res=>{
    //   if(res && res.status == 1){
    //     var max = parseInt(res.data.max_val) + 5000;
    //     var min = parseInt(res.data.min_val) - 500;
    //     this.maxValue = max;
    //     this.minValue = min >0 ? min : 100;
    //   }
    // })
  }

  ngOnInit(): void {
    console.log("sssssssssssssssssssssssssssssss");
    
    window.scroll(0, 0);
    this.getCartDetails();
    this.apiService.CommonApi(Apiconfig.allCategory.method, Apiconfig.allCategory.url, {}).subscribe(res => {

      if (res && res.status == 1) {
        this.category_sub = res.list
        // console.log("---------------------- this.category_sub--------------------------------", this.category_sub)
      }


    })

    this.apiService.CommonApi(Apiconfig.fCategory.method, Apiconfig.fCategory.url, {}).subscribe(result => {


      // console.log("---------------res-----------------res--------producr-----", result)

      // console.log(result, 'resultttt');
      // const all_sub=result.scat
      // console.log(result, 'this are the result');
      this.category_sub = result.list
      this.all_Subs = result.scat;
      // console.log(this.all_Subs, 'what is the result?');

      // const map = {};
      // all_sub.forEach((item) => {
      //   item.map = { ...item, children: [] };
      // });
      // all_sub.forEach((item) => {
      //   if (item.rcategory !== null) {
      //     map[item.rcategory].children.push(map[item._id]);
      //   } else {
      //     tree.push(map[item._id]);
      //   }
      // });
      // console.log(all_sub,'this is the tree');

      // if (result && result.status == 6) {
      //   this.fcategory = result.list;
      // }
    })



    this.activatedRoute.queryParams.subscribe(params => {
      console.log(params, "params")
      /* this.checkobx = {}
      this.subcheckbox = {} */
      if (params['filter']) {
        var queryObj = atob(params['filter']);
        const filter = JSON.parse(queryObj);
        this.queryData = JSON.parse(queryObj);


        if (filter.filter != undefined) {
          this.filter_data = filter.filter;
        }
        if (filter && filter.category) {
          this.category = filter.category;

          if (this.category.length > 0) {
            for (const categor of this.category) {
              this.parent_checkfalse = categor.rcat

              this.checkobx[categor.rcat] = true;


              this.id = categor.rcat

              if (categor.scat.length > 0) {
                for (const subcateg of categor.scat) {

                  this.checkfalse = subcateg



                  this.subcheckbox[subcateg] = true;


                }




              }







            }



          } else {


          }


        } else {
          this.category = []
        }

        if (filter.category_name != undefined && filter.category_name != null) {
          this.category_name.push(filter.category_name)

          // console.log("filter.category_name", filter.category_name)
        }
        if (filter.pricedtl != undefined) {
          this.pricedtl = filter.pricedtl;
          if (this.pricedtl.length > 0) {
            for (const price of this.pricedtl) {
              if (price.minprice == 100 && price.maxprice == 3000) {
                this.pricebox[1031] = true;
              }
              if (price.minprice == 3000 && price.maxprice == 10000) {
                this.pricebox[2051] = true;
              }

              if (price.minprice == 10000 && price.maxprice == 25000) {
                this.pricebox[51101] = true;
              }

              if (price.minprice == 25000 && price.maxprice == 40000) {
                this.pricebox[101201] = true;
              }

              if (price.minprice == 35000 && price.maxprice == 50000) {
                this.pricebox[201501] = true;
              }

              if (price.minprice == 50000 && price.maxprice == 1000000) {
                this.pricebox[5011000000] = true;
              }
            }
          } else {
            this.pricebox = {};
          }
        } else {
          this.pricebox = {};
        }
        if (filter && filter.size_filter) {
          this.filterSize = filter.size_filter
        } else {
          this.filterSize = [];
        }
        if (filter.filter) {

          this.sort_filter = filter.filter;
          // this.sort_filter_value = filter.filter
        } else {
          console.log(" this.sort_filter", this.sort_filter)
          this.sort_filter = 'latest'
        }
        var data = {
          category: filter.category,
          search: filter.psearch,
          filter: filter.filter ? filter.filter : 'latest',
          pricedtl: filter.pricedtl,
          skip: this.skip,
          limit: this.limit,
          size_filter: filter.size_filter
        } as any;
        if (this.rating_filter) {
          data.rating_filter = this.rating_filter;
        }
        // console.log("-------------------------ngononit line338------------------------------", this.final_child_arr)
        this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, data).subscribe(res => {


          if (res && res.status == 1) {
            this.pro_count = res.count;
            this.totalItems = res.count;
            this.productList = res.productlist || [];

            this.productList.map(x => {
              if (x.size_status == 2 && x.quantity > 0) {
                x.product_avail = true
              } else {
                x.product_avail = false
              }
            })
            if (filter.psearch) {
              this.id = this.productList[0].rcat_id
            }
            this.showproduct = true;
            window.scroll(0, 0);
          }
        })
        setTimeout(() => {
          this.getCategoryName(this.category);
        }, 100);
      }
    })

    this.getRecentlyData();

    // var recentId = localStorage.getItem('recently_visit');
    // if(recentId){
    //   var id_recent = JSON.parse(recentId);
    //   var bb= new Object(id_recent);
    //   this.apiService.CommonApi(Apiconfig.recentlyVisit.method, Apiconfig.recentlyVisit.url,{idDoc: id_recent.reverse()}).subscribe(result=>{
    //     if(result && result.status){
    //       this.recentlyVistProd = result.data ? result.data: [];
    //     }
    //   })
    // }

    if (this.userId) {
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: this.userId }).subscribe(result => {
        if (result && result.status == 1) {
          this.faviroitList = result && result.data ? (result.data && result.data.length > 0 ? result.data.map(i => { return i.product_id }) : []) : [];
        }
      })
    }
    this.cdr.detectChanges();
  } //end

  getRecentlyData() {
    var userdata = {} as any;
    if (this.userId) {
      userdata.user_id = this.userId;
      userdata.type = 'recently_visit';
    } else {
      var serveykey = localStorage.getItem('user_key')
      if (serveykey) {
        userdata.user_id = serveykey;
        userdata.type = 'recent_temp_visit';
      }
    }
    this.apiService.CommonApi(Apiconfig.recentlyVisit.method, Apiconfig.recentlyVisit.url, userdata).subscribe(result => {
      if (result && result.status) {
        this.recentlyVistProd = result.data ? result.data : [];
        var dat = new Object(this.recentlyVistProd);
        this.recentlyVistProd.reverse()

      }
    })
  }

  getCategoryName(category) {


    if (category && category.length > 0) {


      if (this.category_sub && this.category_sub.length > 0) {



        this.category_sub.map((e) => {

          category.map(i => {

            if (e._id == i.rcat) {
              this.category_name = []
              this.category_name.push(e.rcatname)

            }


          })
        })
      } else {
        this.category_name;
        // console.log("--------this.category_name--------------", this.category_name)
      }

    } else {
      this.category_name = [];
    }

    this.cdr.detectChanges();

  }

  // ngOnDestroy(): void{
  //   this.route.navigate([], { queryParams: {} });
  // }

  changeSort(filter) {



    this.sort_filter = filter;
    this.queryData.filter = filter;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
    })
  }

  ngAfterViewInit(): void {

  }

  // get totalCount(): number {
  //   return this.totalItems;
  // }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get paginatedItems(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.productList.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.skip = (page * this.limit) - this.limit;
    this.ngOnInit();
  }

  getVisiblePageNumbers(): number[] {
    const visiblePages = 4;
    const halfVisiblePages = Math.floor(visiblePages / 2);
    const startPage = Math.max(this.currentPage - halfVisiblePages, 1);
    const endPage = Math.min(startPage + visiblePages - 1, this.totalPages);
    return Array.from({ length: (endPage - startPage + 1) }, (_, i) => i + startPage);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.skip = (page * this.limit) - this.limit;
      this.ngOnInit();
    }
  }

  // getPagesArray(): number[] {
  //   if(this.totalPages())
  //   return Array(this.totalPages()).fill(0).map((x, i) => i + 1);
  // }
  un_check(mcat) {

    let uncheck_id = this.category_sub.map(x => {
      if (x._id == mcat) {
        this.checkobx[mcat] = true
      } else {
        this.checkobx[x._id] = false
      }


    })
  }
  getproductfilter(mcat) {
    // this.final_child_arr = []

    var obj = { rcat: mcat, scat: [] }
    /* var index = this.category.findIndex(t => t.rcat == mcat);
    if (index == -1) { */
    this.category = []
    this.category.push(obj);


    /*  } else {
 
       this.category.splice(index, 1);
     } */
    this.subcheckbox = {};
    this.selectedCategory = {};
    this.childcheckbox = {};
    this.sub = []
    this.variance_checkbox = {}
    this.filterSize = []
    delete this.queryData.category;
    if (this.category.length > 0) {
      this.queryData.category = this.category;
    }
    delete this.queryData.psearch;
    delete this.queryData.size_filter;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    delete this.queryData.psearch;

    // this.queryData.this.final_child_arrc
    // console.log("-------------this.queryData------------getproductfilter----------", this.queryData)
    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
      this.subcheckbox = {};
      this.selectedCategory = {};
    })

    // get_variance
    this.apiService.CommonApi(Apiconfig.get_variance.method, Apiconfig.get_variance.url, { id: mcat }).subscribe(res => {
      if (res.status == 1) {
        this.variance = res.res

        console.log("----------this.variance------------------", this.variance)

      }



    })
    this.cdr.detectChanges()
  }


  getproductfilters(mcat, scat, istop, hold) {
    // this.final_child_arr = []

    if (!this.sampleobj[mcat]) {
      this.sampleobj[mcat] = [];

    }

    if (hold == true) {
      if (this.subcheckbox[scat] == true) {
        console.log("--------------this.sampleobj-----comming into subcheckbox-----------subcheckbox------", this.sampleobj[mcat])

        this.remove_parent_cat(mcat)
        this.sub.push(scat)
        if (this.childcheckbox[scat] == false) {
          this.childcheckbox[scat] = undefined
        }


      }
      if (this.subcheckbox[scat] == false && this.childcheckbox[scat] != true) {





        this.remove_parent_cat(scat)

        let allchilds = this.selectedCategory[scat].map(x => x._id)

        console.log("-------allchilds-----------------------", allchilds)
        this.sub = this.sub.filter(ele => !allchilds.includes(ele))

        console.log("------------this.sub-----------", this.sub)
        this.buildTrees(scat)


      }
    }



    if (hold == false) {
      if (this.childcheckbox[scat] == true) {


        console.log("comming after first attemp")

        this.sampleobj[mcat].push(scat)
        if (this.sub && this.sub.length > 0) {
          this.sub.push(scat)
          this.remove_parent_cat(mcat)


        } else {
          this.sub.push(scat);


        }



      }




      if (this.childcheckbox[scat] == false) {


        this.remove_parent_cat(scat)

        this.buildTrees(scat)
        this.sampleobj[mcat] = this.sampleobj[mcat].filter(i => i != scat)



        if (this.sampleobj[mcat] && this.sampleobj[mcat].length == 0) {


          this.sub.push(mcat)

        }

      }
    }




    // if ( ) {
    //   scats.push(mcat)
    // }


    // this.buildTrees(scat, istop)


    /* var find = this.category.find(e => {
      return e.rcat == mcat
    })
    if (find == undefined) { */
    // if (!istop) {

    //   this.selectedCategory = {};

    //   this.childcheckbox = {};
    // }
    // var sub = [];
    // this.sub = []









    // if (!istop) {

    //   if (this.childcheckbox[scat] == false) {
    //     sub.push(mcat);
    //   } else {
    //     sub.push(scat);

    //   }


    // }
    // if (this.childcheckbox == false && !istop) {
    //   console.log("---------------!istop && this.childcheckbox -------")
    //   sub.push(mcat);
    // }
    var ract = [];
    ract.push(mcat)
    this.category = [];
    this.category.push({ rcat: mcat, scat: this.sub });
    if (this.category.length > 0) {
      this.queryData.category = this.category;
    } else {
      delete this.queryData.category;
    }


    delete this.queryData.psearch;

    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });


    // this.queryData.scat_array = this.final_child_arr

    console.log("-------------------this.query data-----------------------", this.queryData)



    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {

      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
    })
    /* } else {
      var subCat = find.scat || [];
      var index = subCat.indexOf(scat);
      if (index == -1) {
        subCat.push(scat);
      } else {
        subCat.splice(index, 1);
      }
 
      this.category = this.category.map(e => {
        if (e.rcat == find.rcat) {
          e.scat = subCat;
          return e
        } else {
          return e
        }
      });
      if (this.category.length > 0) {
        this.queryData.category = this.category;
      } else {
        delete this.queryData.category;
      }
      delete this.queryData.psearch;
      this.queryData.skip = this.skip;
      this.queryData.limit = this.limit;
      var value = JSON.stringify(this.queryData);
      this.route.navigate([], { queryParams: { filter: btoa(value) } });
      this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
        if (res && res.status == 1) {
          this.pro_count = res.count;
          this.totalItems = res.count;
          this.productList = res.productlist || [];
          this.showproduct = true;
          window.scroll(0, 0);
        }
      })
    } */
    this.cdr.detectChanges()
  }
  remove_parent_cat(par) {
    // const val = this.sub.indexOf(par)
    // if (val != -1) {
    //   this.sub.splice(val, 1)
    // }

    // console.log("-----------------------------previoious filters----------------------", this.sub)
    this.sub = this.sub.filter(item => item != par);



  }
  buildTrees(parent) {
    // console.log(parent, this.all_Subs);

    let tree = [];
    this.parent_list.push(parent);
    // console.log(i, this.selectedCategory)
    for (let item of this.all_Subs) {


      if (item.rcategory == parent) {
        // console.log("item.rcategory == parent", item);

        let children = this.buildTrees(item._id);

        // console.log("--------------------children---------------------", children)
        if (children.length) {
          children.filter(x => {
            // console.log("xxxxxxxxxxxxxxxxx-------xxxxxxxxxxxxxxxxxxx", x._id)
            this.final_child_arr.push(item._id, x._id)



            // if (this.final_child_arr.length > 0) {
            //   this.final_child_arr.forEach(y => {
            //     if (y != x._id) {
            //       this.final_child_arr.push(x._id)
            //     }
            //   })
            // } else {
            //   this.final_child_arr.push(x._id)
            // }
          })

          console.log("---------------this.final_child_arr-------------------", this.final_child_arr)

          this.sub = this.sub.filter(x => !this.final_child_arr.includes(x))

          console.log("--------------t this.sub--------- this.sub---------", this.sub)
        }


        if (children.length) {
          item.children = children;
        }
        tree.push(item);

      }

    }


    this.selected_cats_children[parent] = tree;
    // console.log("-------------------- this.selected_cats_children['aaaaaaaaaaaaa']---------------------------", this.selected_cats_children[parent])
    // console.log(this.selectedCategory)


    return tree;
  }


  variance_filter(id) {


    if (this.variance_checkbox[id] == true) {
      this.filterSize.push(id)
    }

    if (this.variance_checkbox[id] == false) {
      this.filterSize = this.filterSize.filter(x => x != id)

      console.log("-----------------this.filterSize-----------------------------------", this.filterSize)
    }

    // if (!id) {

    // } else {
    //   
    // }
    delete this.queryData.filter;
    delete this.queryData.psearch;
    this.queryData.size_filter = this.filterSize;
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;

    console.log("-------------this.queryData------------------------", this.queryData)


    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
    })

  }
  getpricefilters(minprice, maxprice) {
    var find = this.pricedtl.find(e => {
      return e.minprice == minprice
    })
    if (find == undefined) {
      var obj = { minprice: minprice || 0, maxprice: maxprice || 10000 };
      this.pricedtl.push(obj);
    } else {
      this.pricedtl = JSON.parse(JSON.stringify(this.pricedtl)).filter(function (item) {
        return item.minprice !== minprice;
      });
    }
    if (this.pricedtl.length > 0) {
      this.queryData.pricedtl = this.pricedtl;
    } else {
      delete this.queryData.pricedtl
    }
    delete this.queryData.psearch;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });

    console.log("-------------getpricefilters----------------")
    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
    })
  }

  getFilterDetails(filter) {
    this.filter_data = filter || 'default';
    this.queryData['filter'] = filter || 'default';
    var value = JSON.stringify(this.queryData);
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    delete this.queryData.psearch;
    this.route.navigate([], { queryParams: { filter: btoa(value) } });

    console.log("-------------getFilterDetails------------------------")
    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
    })
  }

  getFilterSize(size) {
    var index = this.filterSize.indexOf(size);
    if (index == -1) {
      this.filterSize.push(size);
    } else {
      this.filterSize.splice(index, 1);
    }
    delete this.queryData.filter;
    delete this.queryData.psearch;
    this.queryData.size_filter = this.filterSize;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    console.log("--------- getFilterSize(size)------------")
    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        window.scroll(0, 0);
      }
    })
  }

  clearFilter() {

    this.name_contorl = 0


    delete this.queryData.category;
    delete this.queryData.psearch;
    delete this.queryData.size_filter;
    delete this.queryData.pricedtl;
    this.checkobx = {};
    this.subcheckbox = {};
    this.childcheckbox = {};
    this.selectedCategory = {};
    this.sub = []
    this.sampleobj = {}
    this.variance_checkbox = {}
    this.queryData = { filter: 'latest' };

    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });

    console.log("------------------clearFilter()------------------------------")
    this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.count;
        this.totalItems = res.count;
        this.productList = res.productlist || [];
        this.showproduct = true;
        this.ngOnInit()
      } else {
        this.showproduct = true;
      }
    })
  }

  onSliderChange(num) {
    console.log("num ++++++++++++++++++++", num)
    // var obj = { minprice: this.minValue || 0, maxprice: this.maxValue || 100 };
    // var value = [];
    // value.push(obj)
    // this.queryData.pricedtl = value;
    // var data = JSON.stringify(this.queryData);
    // this.route.navigate([], { queryParams: { filter: btoa(data) } });
    // this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
    //   if (res && res.status == 1) {
    //     this.pro_count = res.count;
    //     this.productList = res.productlist || []
    //   }
    // })
  }

  getCartDetails() {
    console.log('&&&&&&&&&&&&&&&&&&&&&&')
    var data = {} as any;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.user_id = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey')
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    data.schedule_type = 0;
    if (data.userId != '') {
      data.client_offset = (new Date).getTimezoneOffset();
      this.socketService.socketCall('r2e_cart_details', data).subscribe(response => {
        if (response.err == 0) {
          this.cartDetails = response.cartDetails;
          this.cart_details = this.cartDetails ? (this.cartDetails.cart_details && this.cartDetails.cart_details.length > 0 ? this.cartDetails.cart_details.map(e => { return e.id }) : []) : [];
        }
      })
    }
  }

  preAddCart(product, action) {
    if (typeof this.quantity_details.noquant == "undefined" || this.quantity_details.noquant == 0) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };
      this.addToCart(product, this.quantity_details);
    }
  }
  addToCart(product, variant) {
    var data = {} as any;
    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcat_id;
    data.scat_id = product.scat_id;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    // data.selectedVarientId:product.
    data.size_status = product.size_status;
    data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = variant.noquant;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey')
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }

    if (data.userId != '') {
      this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
        if (result && result.err == 0) {
          this.route.navigate(['/cart']);
          this.getCartDetails();
          var data = {
            page: 'register'
          }
          this.apiService.realoadFunction({ data: data });
          // setTimeout(() => {

          // }, 200);
        }
        // else{
        //   this.notifyService.showError(result.message || 'Somthing went wrong')
        // }
      })
    }
  }

  addFavourite(id, template: any) {
    var userid = localStorage.getItem('userId');
    if (userid) {
      var obj = {
        product_id: id,
        user_id: userid,
      }
      this.apiService.CommonApi(Apiconfig.addFavourite.method, Apiconfig.addFavourite.url, obj).subscribe(result => {
        if (result) {
          if (result.status == 1) {
            this.notifyService.showSuccess(result.message);
            // this.ngOnInit();
          } else {
            if (result.status === 0 && result.errors == 'Product already exists') {
              this.apiService.CommonApi(Apiconfig.delteFavourite.method, Apiconfig.delteFavourite.url, { fav_id: result.favorite_id }).subscribe(res => {
                if (res && res.status === 1) {
                  this.notifyService.showSuccess(res.message);
                  // this.ngOnInit();
                } else {
                  this.notifyService.showError(res.message || 'Something went wrong!');
                }
              })
            } else {
              this.notifyService.showError(result.message);
            }
          }
        } else {
          // this.notifyService.showError('Please try again..');
          this.modalServices.triggerOpenLoginModal();

        }
      })
    } else {
      this.modalRef = this.modalService.show(template, { id: 1, class: 'login-model', ignoreBackdropClick: false });
      this.notifyService.showError('please login...');
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

  menu_click(value) {
    if (value == "add") {
      document.getElementById("product-filter-sec").className = "product-filter-sec active"
    } else {
      document.getElementById("product-filter-sec").className = "product-filter-sec"
    }
  }

  slickInit(e) {
    console.log('slick initialized');
  }

  breakpoint(e) {
  }

  afterChange(e) {
    if (e) {
      this.active_slider = e.currentSlide;
      console.log('afterChange', e);
    }
  }

  beforeChange(e) {
    console.log('beforeChange');
  }
  viewMore() {
    this.route.navigate(['/products'])
  }
  preious(i) {

  }
  nextpage(i) {

  }


  buildTree(parent, i?, istop?) {


    this.tree = []
    // this.parent_list.push(parent);
    // console.log(i, this.selectedCategory)
    for (let item of this.all_Subs) {

      if (item.rcategory == parent) {
        // console.log(item.rcategory == parent, item.rcategory, parent);

        /* let children = this.buildTree(item._id);
 
        if (children.length) {
          item.children = children;
        } */
        if (istop && this.subcheckbox[parent]) {
          this.tree.push(item);
        }
        if (!istop && this.childcheckbox[parent]) {
          this.tree.push(item);
        }

      }
    }
    // console.log(this.tree);
    this.selectedCategory[parent] = this.tree


    // this.select_subcat.push(this.tree)
    // console.log(this.selectedCategory, ' this.selectedCategory');
    console.log(this.category_sub, ' this.category_sub');

    // console.log("-------------dddd--", this.subcheckbox[parent], this.childcheckbox[parent])
    if ((this.subcheckbox[parent] == false || !istop) && !this.childcheckbox[parent]) {

      this.removesublevels(parent);
    }

  }


  hover_value(i) {
    console.log("mousevalue", i)
    this.show_arr_value = i
  }




  removesublevels(id) {

    this.selectedCategory[id] = [];
    this.childcheckbox[id] = false;
    let subexists: any = this.all_Subs.filter(e => e.rcategory == id);

    if (subexists && subexists.length > 0) {

      subexists.forEach(e => {

        this.removesublevels(e._id);
      });
    }
  }
  prod_click() {
    console.log("-------------i------------------------")
  }















  //  calcul_page(page){
  //   if(this.currentPage == 1){
  //     return page
  //   }else if(this.currentPage == this.totalPages()){
  //     if(page == 1){
  //       return this.currentPage-2
  //     }else if(page == 2){
  //       return this.currentPage-1
  //     }else{
  //       return this.currentPage
  //     }
  //   }else{
  //     if(page == 1){
  //       return this.currentPage-1
  //     }else if(page == 2){
  //       return this.currentPage
  //     }else{
  //       return this.currentPage+1
  //     }

  //   }
  // }

  ratingFilterUpdate(rating) {
    if (rating) {
      this.queryData.rating_filter = rating;
      this.rating_filter = rating;
      this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
        if (res && res.status == 1) {
          this.pro_count = res.count;
          this.totalItems = res.count;
          this.productList = res.productlist || [];
          this.showproduct = true;
          window.scroll(0, 0);
        }
      })
    }
  }

}
