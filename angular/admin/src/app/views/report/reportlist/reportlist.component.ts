import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

import html2pdf from 'html2pdf.js';



interface Attendance {
  employeeName: string;
  date: string;
  idNo: string;
  status: string;
  lastMonthRecord: string;
  remarks: string;
  totalDays: string;
}

interface Payment {
  name: string; // Client or Vendor
  contractId: string;
  invoiceNo: string;
  dueDate: string;
  amountPaid: number;
  status: string;
  balance: number;
  remarks: string;
}
@Component({
  selector: 'app-reportlist',
  templateUrl: './reportlist.component.html',
  styleUrls: ['./reportlist.component.scss']
})

export class ReportlistComponent {

  // settings: any;
  // source: LocalDataSource = new LocalDataSource();
  // skip: number = 0;
  // limit: number = 10;
  // count: number = 0;
  // curentUser: any;
  // settingData: any;
  // default_limit: number = 10;
  // userPrivilegeDetails: any;
  // add_btn: boolean = false;
  // edit_btn: boolean = true;
  // view_btn: boolean = false;
  // bulk_action: boolean = true;
  // delete_btn: boolean = true;
  // addBtnUrl: string = '/app/report/report-add';
  // addBtnName: string = 'Report Templete Add';
  // editUrl: string = '/app/report/report-edit/';
  // deleteApis: apis = Apiconfig.reportTempletDelete;
  // inactiveApis: apis = Apiconfig.reportTemplateInactive;
  // card_details: any[] = [];
  // global_status: number = 0;
  // global_search: string;
  // user_list_filter_action:boolean=true;


  // constructor(
  //   private apiService: ApiService,
  //   private router: Router,
  //   private authService: AuthenticationService,
  //   private cd: ChangeDetectorRef,
  //   private getSettings: TableSettingsService,
  //   private notifyService: NotificationService,
  // ) {
  //   this.curentUser = this.authService.currentUserValue;
  //   if (this.curentUser && this.curentUser.role == "subadmin") {
  //     if (this.router.url == '/app/report/report-list') {
  //       this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'report');
  //       if (!this.userPrivilegeDetails[0].status.view) {
  //         this.notifyService.showWarning('You are not authorized this module');
  //         this.router.navigate(['/app']);
  //       };
  //       if (this.userPrivilegeDetails[0].status.delete) {
  //         this.delete_btn = true;
  //       } else {
  //         this.delete_btn = false;
  //       }
  //       if (this.userPrivilegeDetails[0].status.edit) {
  //         this.edit_btn = true;
  //       } else {
  //         this.edit_btn = false;
  //       }
  //     }
  //   }
  //   this.loadsettings('');
  // }

  // ngOnInit(): void {
  //   var data = {
  //     'skip': this.skip,
  //     'limit': this.default_limit,
  //     'status': this.global_status,
  //     'search': this.global_search
  //   };
  //   this.getDataList(data);
  // }

  // getDataList(data) {
  //   this.apiService.CommonApi(Apiconfig.reportTempletList.method, Apiconfig.reportTempletList.url, data).subscribe(
  //     (result) => {
  //       if (result && result.status == 1) {
  //         this.source.load(result.data.userData);
  //         this.count = result.data.count;
  //         this.cd.detectChanges();
  //       }
  //     }
  //   )
  // };

  // onDeleteChange(event) {
  //   if (event && event.status == 1) {
  //     this.skip = 0;
  //     this.ngOnInit();
  //   }
  // };
  // onInactivechange(event) {
  //   if (event && event.status == 1) {
  //     // this.skip = 0;
  //     this.ngOnInit();
  //   }
  // }


  // onSearchChange(event) {
  //   this.source = new LocalDataSource();
  //   this.global_search = event;
  //   let data = {
  //     'skip': this.skip,
  //     'limit': this.limit,
  //     'status': this.global_status,
  //     'search': event
  //   }
  //   this.getDataList(data);
  // };

  // onitemsPerPageChange(event) {
  //   this.limit = event;
  //   this.skip = 0;
  //   this.default_limit = event;
  //   this.source = new LocalDataSource();
  //   let data = {
  //     'skip': this.skip,
  //     'limit': this.limit,
  //     'status': this.global_status,
  //     'search': this.global_search
  //   }
  //   this.getDataList(data);
  // };
  // onPageChange(event) {
  //   this.skip = this.limit * (event - 1);
  //   this.source = new LocalDataSource();
  //   let data = {
  //     'skip': this.limit * (event - 1),
  //     'limit': this.limit,
  //     'status': this.global_status,
  //     'search': this.global_search
  //   };
  //   this.getDataList(data);
  // }

  // onheaderCardChange(event) {
  //   this.skip = 0;
  //   this.source = new LocalDataSource();
  //   let data = {
  //     'skip': this.skip,
  //     'limit': this.limit,
  //     'status': this.global_status,
  //     'search': this.global_search
  //   }
  //   if (event == 'all') {
  //     data.status = 0;
  //     this.global_status = 0;
  //   } else if (event == 'active') {
  //     data.status = 1;
  //     this.global_status = 1;
  //   } else if (event == 'inactive') {
  //     data.status = 2;
  //     this.global_status = 2;
  //   } else if (event == 'delete') {
  //     data.status = 4;
  //     this.global_status = 4;
  //   } else if (event == 'today') {
  //     data.status = 5;
  //     this.global_status = 5;
  //   }
  //   this.loadsettings(event);
  //   this.getDataList(data);
  // }

  // loadsettings(event) {
  //   if (event == 'delete') {
  //     this.settings = {
  //       selectMode: 'multi',
  //       hideSubHeader: true,
  //       columns: {
  //         // index: {
  //         //   title: 'S No',
  //         //   type: 'text',
  //         //   valuePrepareFunction: (value, row, cell) => {
  //         //     return cell.row.index + 1 + '.';
  //         //   }
  //         // },
  //         name: {
  //           title: 'Name',
  //           filter: true,
  //           valuePrepareFunction: value => {
  //             return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
  //           }
  //         },
  //         status: {
  //           title: 'Status',
  //           filter: true,
  //           type: 'html',
  //           valuePrepareFunction: value => {
  //             return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" : "<span class='badge badge-pill badge-danger mb-1'>Deleted</span>";
  //           }
  //         },
  //       },
  //       pager: {
  //         display: true,
  //         perPage: this.default_limit
  //       },
  //       actions: {
  //         add: false,
  //         edit: false,
  //         delete: false,
  //         columnTitle: 'Actions',
  //         class: 'action-column',
  //         position: 'right',
  //         custom: [],
  //       },
  //     }
  //     this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/report/report-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  //   } else {
  //     this.settings = {
  //       selectMode: 'multi',
  //       hideSubHeader: true,
  //       columns: {
  //         // index: {
  //         //   title: 'S No',
  //         //   type: 'text',
  //         //   valuePrepareFunction: (value, row, cell) => {
  //         //     return cell.row.index + 1 + '.';
  //         //   }
  //         // },
  //         name: {
  //           title: 'Name',
  //           filter: true,
  //           valuePrepareFunction: value => {
  //             return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
  //           }
  //         },
  //         status: {
  //           title: 'Status',
  //           filter: true,
  //           type: 'html',
  //           valuePrepareFunction: value => {
  //             return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" : "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
  //           }
  //         }
  //       },
  //       pager: {
  //         display: true,
  //         perPage: this.default_limit
  //       },
  //       actions: {
  //         add: true,
  //         edit: false,
  //         delete: false,
  //         columnTitle: 'Actions',
  //         class: 'action-column',
  //         position: 'right',
  //         custom: [],
  //       },
  //     }
  //     this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/report/report-list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  //   };
  // };
  activeTab: string = 'attendance';

  // filters
  searchText: string = '';
  filterStatus: string = '';
  startDate: string = '';
  endDate: string = '';
  sortBy: string = '';

  // Reference to table for PDF
  @ViewChild('tableContent', { static: false }) tableContent!: ElementRef;
  // Attendance
  attendanceData: Attendance[] = [
    { employeeName: 'John Smith', date: '2025-09-01', idNo: 'EMP001', status: 'Present', lastMonthRecord: '25/26', remarks: '-', totalDays: '20/22' },
    { employeeName: 'Mary Johnson', date: '2025-09-01', idNo: 'EMP002', status: 'Absent', lastMonthRecord: '22/26', remarks: 'Sick Leave', totalDays: '18/22' },
    { employeeName: 'David Lee', date: '2025-09-02', idNo: 'EMP003', status: 'Leave', lastMonthRecord: '23/26', remarks: 'Personal', totalDays: '19/22' }
  ];

  // Customers
  customerPayments: Payment[] = [
    { name: 'ABC Corp', contractId: 'CON001', invoiceNo: 'INV-2025-01', dueDate: '2025-09-05', amountPaid: 1500, status: 'Paid', balance: 0, remarks: '-' },
    { name: 'XYZ Ltd', contractId: 'CON002', invoiceNo: 'INV-2025-02', dueDate: '2025-09-10', amountPaid: 800, status: 'Unpaid', balance: 800, remarks: 'Follow-up required' }
  ];

  // Vendors
  vendorPayments: Payment[] = [
    { name: 'Vendor A', contractId: 'VEN001', invoiceNo: 'V-INV-1001', dueDate: '2025-09-03', amountPaid: 500, status: 'Partial', balance: 200, remarks: 'Balance due soon' },
    { name: 'Vendor B', contractId: 'VEN002', invoiceNo: 'V-INV-1002', dueDate: '2025-09-07', amountPaid: 1200, status: 'Paid', balance: 0, remarks: '-' }
  ];

  // dynamic filters + sorts
  get filterOptions() {
    if (this.activeTab === 'attendance') {
      return { label: 'Employee', placeholder: 'Employee Name' };
    }
    if (this.activeTab === 'customers') {
      return { label: 'Client', placeholder: 'Client Name' };
    }
    return { label: 'Vendor', placeholder: 'Vendor Name' };
  }

  get sortOptions() {
    if (this.activeTab === 'attendance') {
      return [
        { value: 'dateAsc', label: 'Date ↑' },
        { value: 'dateDesc', label: 'Date ↓' },
        { value: 'idAsc', label: 'Employee ID' }
      ];
    }
    return [
      { value: 'dateAsc', label: 'Date ↑' },
      { value: 'dateDesc', label: 'Date ↓' },
      { value: 'amountAsc', label: 'Amount ↑' },
      { value: 'amountDesc', label: 'Amount ↓' },
      { value: 'nameAsc', label: this.activeTab === 'customers' ? 'Customer Name' : 'Vendor Name' }
    ];
  }

  // filtered data
  get filteredAttendance() {
    let data = [...this.attendanceData];
    if (this.searchText) {
      data = data.filter(d => d.employeeName.toLowerCase().includes(this.searchText.toLowerCase()));
    }
    if (this.filterStatus) {
      data = data.filter(d => d.status === this.filterStatus);
    }
    if (this.startDate && this.endDate) {
      data = data.filter(d => d.date >= this.startDate && d.date <= this.endDate);
    }
    if (this.sortBy === 'dateAsc') data.sort((a, b) => a.date.localeCompare(b.date));
    if (this.sortBy === 'dateDesc') data.sort((a, b) => b.date.localeCompare(a.date));
    if (this.sortBy === 'idAsc') data.sort((a, b) => a.idNo.localeCompare(b.idNo));
    return data;
  }

  get filteredCustomers() {
    let data = [...this.customerPayments];
    if (this.searchText) data = data.filter(d => d.name.toLowerCase().includes(this.searchText.toLowerCase()));
    if (this.filterStatus) data = data.filter(d => d.status === this.filterStatus);
    if (this.startDate && this.endDate) {
      data = data.filter(d => d.dueDate >= this.startDate && d.dueDate <= this.endDate);
    }
    if (this.sortBy === 'dateAsc') data.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (this.sortBy === 'dateDesc') data.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    if (this.sortBy === 'amountAsc') data.sort((a, b) => a.amountPaid - b.amountPaid);
    if (this.sortBy === 'amountDesc') data.sort((a, b) => b.amountPaid - a.amountPaid);
    if (this.sortBy === 'nameAsc') data.sort((a, b) => a.name.localeCompare(b.name));
    return data;
  }

  get filteredVendors() {
    let data = [...this.vendorPayments];
    if (this.searchText) data = data.filter(d => d.name.toLowerCase().includes(this.searchText.toLowerCase()));
    if (this.filterStatus) data = data.filter(d => d.status === this.filterStatus);
    if (this.startDate && this.endDate) {
      data = data.filter(d => d.dueDate >= this.startDate && d.dueDate <= this.endDate);
    }
    if (this.sortBy === 'dateAsc') data.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (this.sortBy === 'dateDesc') data.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    if (this.sortBy === 'amountAsc') data.sort((a, b) => a.amountPaid - b.amountPaid);
    if (this.sortBy === 'amountDesc') data.sort((a, b) => b.amountPaid - a.amountPaid);
    if (this.sortBy === 'nameAsc') data.sort((a, b) => a.name.localeCompare(b.name));
    return data;
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.searchText = '';
    this.filterStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.sortBy = '';
  }


  downloadPDF() {
    const element = this.tableContent.nativeElement;
    const opt = {
      margin: 0.5,
      filename: `${this.activeTab}-report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
  }
}
