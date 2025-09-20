import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-add-new-employees',
  templateUrl: './add-new-employees.component.html',
  styleUrls: ['./add-new-employees.component.scss']
})
export class AddNewEmployeesComponent implements OnInit {
  mode: 'add' | 'edit' | 'view' = 'add';
  id: string | null = null;
  readonly: boolean = false;

  // employee fields
  fullName: string = '';
  nationality: string = '';
  bloodGroup: string = '';
  dob: string = '';
  permanentAddress: string = '';

  designation: string = '';
  employeeId: string = '';
  employmentType: string = 'Full-Time';
  dateOfJoining: string = '';
  underContract: string = '';
  salary: number;

  bankName: string = '';
  accountNo: string = '';
  ifsc: string = '';

  nomineeName: string = '';
  nomineeRelation: string = '';
  nomineeContact: string = '';

  visaExpiry: string = '';
  licenseNo: string = '';
  role: string = 'Staff';
  status: number = 1;

  // options from backend
  contractOptions: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private notifyService: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.id = params['id'];
        this.mode = this.router.url.includes('view') ? 'view' : 'edit';
        this.readonly = this.mode === 'view';
        this.getEmployee();
      }
    });

    this.loadContracts();
  }

  loadContracts() {
    this.apiService.CommonApi(Apiconfig.listContracts.method, Apiconfig.listContracts.url, { status: 1 })
      .subscribe((res: any) => {
        this.contractOptions = res.data || [];
      });
  }

  getEmployee() {
    this.apiService.CommonApi(Apiconfig.viewEmployee.method, Apiconfig.viewEmployee.url, { id: this.id })
      .subscribe((res: any) => {
        if (res.status) {
          const emp = res.data;
          this.fullName = emp.fullName;
          this.nationality = emp.nationality;
          this.bloodGroup = emp.bloodGroup;
          this.dob = emp.dob ? emp.dob.split('T')[0] : '';
          this.permanentAddress = emp.permanentAddress;
          this.designation = emp.designation;
          this.employeeId = emp.employeeId;
          this.employmentType = emp.employmentType;
          this.dateOfJoining = emp.dateOfJoining ? emp.dateOfJoining.split('T')[0] : '';
          this.underContract = emp.underContract;
          this.salary = emp.salary;
          this.bankName = emp.bankDetails?.bankName;
          this.accountNo = emp.bankDetails?.accountNo;
          this.ifsc = emp.bankDetails?.ifsc;
          this.nomineeName = emp.nominee?.name;
          this.nomineeRelation = emp.nominee?.relation;
          this.nomineeContact = emp.nominee?.contact;
          this.visaExpiry = emp.visaExpiry ? emp.visaExpiry.split('T')[0] : '';
          this.licenseNo = emp.licenseNo;
          this.role = emp.role;
          this.status = emp.status;
        }
      });
  }

  submitForm(form: any) {
    if (form.invalid) {
      this.notifyService.showError('Please fill all required fields');
      return;
    }

    const payload = {
      _id: this.id,
      fullName: this.fullName,
      nationality: this.nationality,
      bloodGroup: this.bloodGroup,
      dob: this.dob,
      permanentAddress: this.permanentAddress,
      designation: this.designation,
      employeeId: this.employeeId,
      employmentType: this.employmentType,
      dateOfJoining: this.dateOfJoining,
      underContract: this.underContract,
      salary: this.salary,
      bankDetails: {
        bankName: this.bankName,
        accountNo: this.accountNo,
        ifsc: this.ifsc
      },
      nominee: {
        name: this.nomineeName,
        relation: this.nomineeRelation,
        contact: this.nomineeContact
      },
      visaExpiry: this.visaExpiry,
      licenseNo: this.licenseNo,
      role: this.role,
      status: this.status
    };

    this.apiService.CommonApi(Apiconfig.saveEmployee.method, Apiconfig.saveEmployee.url, payload)
      .subscribe((res: any) => {
        if (res.status) {
          this.notifyService.showSuccess(this.id ? 'Employee updated successfully' : 'Employee added successfully');
          this.router.navigate(['/app/employees/list']);
        } else {
          this.notifyService.showError('Failed to save employee');
        }
      });
  }

  cancel() {
    this.router.navigate(['/app/employees/list']);
  }
}
