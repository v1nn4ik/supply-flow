import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-employee-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dialog-overlay" (click)="onClose()">
      <div class="dialog-container" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Добавить сотрудника</h2>
          <button class="close-button" (click)="onClose()">×</button>
        </div>
        
        <form [formGroup]="employeeForm" (ngSubmit)="onSubmit()">
          <div class="dialog-content">
            <div class="form-row">
              <div class="form-field">
                <label>Фамилия</label>
                <input type="text" formControlName="lastName" required>
                <div class="error" *ngIf="employeeForm.get('lastName')?.hasError('required') && employeeForm.get('lastName')?.touched">
                  Фамилия обязательна
                </div>
              </div>

              <div class="form-field">
                <label>Имя</label>
                <input type="text" formControlName="firstName" required>
                <div class="error" *ngIf="employeeForm.get('firstName')?.hasError('required') && employeeForm.get('firstName')?.touched">
                  Имя обязательно
                </div>
              </div>

              <div class="form-field">
                <label>Отчество</label>
                <input type="text" formControlName="middleName">
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Телефон</label>
                <input type="tel" formControlName="phone" required placeholder="7XXXXXXXXXX">
                <div class="error" *ngIf="employeeForm.get('phone')?.hasError('required') && employeeForm.get('phone')?.touched">
                  Телефон обязателен
                </div>
                <div class="error" *ngIf="employeeForm.get('phone')?.hasError('pattern') && employeeForm.get('phone')?.touched">
                  Неверный формат телефона
                </div>
              </div>

              <div class="form-field">
                <label>Дата рождения</label>
                <input type="date" formControlName="birthDate" required>
                <div class="error" *ngIf="employeeForm.get('birthDate')?.hasError('required') && employeeForm.get('birthDate')?.touched">
                  Дата рождения обязательна
                </div>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="cancel-button" (click)="onClose()">Отмена</button>
            <button type="submit" class="submit-button" [disabled]="employeeForm.invalid || isSubmitting">
              {{ isSubmitting ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./add-employee-dialog.component.scss']
})
export class AddEmployeeDialogComponent {
  @Output() submit = new EventEmitter<any>();

  employeeForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private dialogRef: MatDialogRef<AddEmployeeDialogComponent>
  ) {
    this.employeeForm = this.fb.group({
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      middleName: [''],
      phone: ['', [Validators.required, Validators.pattern(/^7\d{10}$/)]],
      birthDate: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      this.isSubmitting = true;
      const formData = new FormData();

      // Добавляем все поля формы
      Object.keys(this.employeeForm.value).forEach(key => {
        if (key === 'birthDate') {
          formData.append(key, this.employeeForm.value[key]);
        } else {
          formData.append(key, this.employeeForm.value[key]);
        }
      });

      this.userService.createUser(formData).subscribe({
        next: (response) => {
          this.submit.emit(response);
          this.onClose();
        },
        error: (error) => {
          console.error('Ошибка при создании сотрудника:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
} 