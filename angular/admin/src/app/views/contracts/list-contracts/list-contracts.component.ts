import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { Router } from '@angular/router';

@Component({
  selector: 'app-list-contracts',
  templateUrl: './list-contracts.component.html',
  styleUrls: ['./list-contracts.component.scss']
})
export class ListContractsComponent implements OnInit {
  contracts: any[] = [];
  loading = false;

  constructor(private apiService: ApiService,private router: Router,) {}

  ngOnInit(): void {
    this.getContracts();
  }

  getContracts() {
    this.loading = true;
    this.apiService.CommonApi(
      Apiconfig.listContracts.method,
      Apiconfig.listContracts.url,
      { status: 1 }   // fetch only active contracts
    ).subscribe({
      next: (res) => {
        if (res && res.status) {
          this.contracts = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  viewContract(contract: any) {
    console.log('View contract', contract);
    this.router.navigate([`/app/contracts/view/${contract._id}`]);
  }

  editContract(contract: any) {
    console.log('Edit contract', contract);
    this.router.navigate([`/app/contracts/edit/${contract._id}`]);
  }

  // deleteContract(contract: any) {
  //   if (confirm('Are you sure you want to delete this contract?')) {
  //     this.apiService.CommonApi(
  //       Apiconfig.deleteContract.method,
  //       Apiconfig.deleteContract.url,
  //       { id: contract._id }
  //     ).subscribe((res) => {
  //       if (res && res.status) {
  //         this.getContracts();
  //       }
  //     });
  //   }
  // }
}
