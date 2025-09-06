import { Component, ElementRef, ViewChild } from '@angular/core';
import html2pdf from 'html2pdf.js';

interface FuelRecord {
  vehicleNo: string;
  driverName: string;
  contractId: string;
  startOdometer: number;
  endOdometer: number;
  prevDate: string;
  amountPaid: number;
  issuedBy: string;
  fuelConsumed: number; // in litres
}

@Component({
  selector: 'app-fuel-records-list',
  templateUrl: './fuel-records-list.component.html',
  styleUrls: ['./fuel-records-list.component.scss']
})
export class FuelRecordsListComponent {
  @ViewChild('fuelTable', { static: false }) fuelTable!: ElementRef;

  // Filters
  searchVehicle: string = '';
  searchDriver: string = '';
  searchContract: string = '';
  startDate: string = '';
  endDate: string = '';
  sortBy: string = '';

  // Dummy Data
  records: FuelRecord[] = [
    { vehicleNo: 'KA-01-AB-1234', driverName: 'John Smith', contractId: 'C001', startOdometer: 12000, endOdometer: 12150, prevDate: '2025-09-01', amountPaid: 500, issuedBy: 'Admin A', fuelConsumed: 10 },
    { vehicleNo: 'KA-01-AB-5678', driverName: 'Mary Johnson', contractId: 'C002', startOdometer: 22000, endOdometer: 22220, prevDate: '2025-09-02', amountPaid: 700, issuedBy: 'Admin B', fuelConsumed: 15 },
    { vehicleNo: 'KA-02-XY-1111', driverName: 'David Lee', contractId: 'C003', startOdometer: 5000, endOdometer: 5100, prevDate: '2025-09-03', amountPaid: 450, issuedBy: 'Admin A', fuelConsumed: 8 }
  ];

  // Filtering + Sorting
  get filteredRecords() {
    let data = [...this.records];

    if (this.searchVehicle) {
      data = data.filter(d => d.vehicleNo.toLowerCase().includes(this.searchVehicle.toLowerCase()));
    }
    if (this.searchDriver) {
      data = data.filter(d => d.driverName.toLowerCase().includes(this.searchDriver.toLowerCase()));
    }
    if (this.searchContract) {
      data = data.filter(d => d.contractId.toLowerCase().includes(this.searchContract.toLowerCase()));
    }
    if (this.startDate && this.endDate) {
      data = data.filter(d => d.prevDate >= this.startDate && d.prevDate <= this.endDate);
    }

    if (this.sortBy === 'dateAsc') data.sort((a, b) => a.prevDate.localeCompare(b.prevDate));
    if (this.sortBy === 'dateDesc') data.sort((a, b) => b.prevDate.localeCompare(a.prevDate));
    if (this.sortBy === 'vehicle') data.sort((a, b) => a.vehicleNo.localeCompare(b.vehicleNo));
    if (this.sortBy === 'driver') data.sort((a, b) => a.driverName.localeCompare(b.driverName));
    if (this.sortBy === 'mileageAsc') data.sort((a, b) => this.calcMileage(a) - this.calcMileage(b));
    if (this.sortBy === 'mileageDesc') data.sort((a, b) => this.calcMileage(b) - this.calcMileage(a));

    return data;
  }

  // Calculate mileage (km/l)
  calcMileage(record: FuelRecord): number {
    return (record.endOdometer - record.startOdometer) / record.fuelConsumed;
  }

  // Export as PDF
  downloadPDF() {
    const element = this.fuelTable.nativeElement;
    const opt = {
      margin: 0.5,
      filename: 'fuel-records.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
  }
}