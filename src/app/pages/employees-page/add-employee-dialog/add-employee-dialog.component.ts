import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../services/user.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-add-employee-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Добавить сотрудника</h2>
      <form [formGroup]="employeeForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Фамилия</mat-label>
              <input matInput formControlName="lastName" required>
              <mat-error *ngIf="employeeForm.get('lastName')?.hasError('required')">
                Фамилия обязательна
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="firstName" required>
              <mat-error *ngIf="employeeForm.get('firstName')?.hasError('required')">
                Имя обязательно
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Отчество</mat-label>
              <input matInput formControlName="middleName">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Телефон</mat-label>
              <input matInput formControlName="phone" required>
              <mat-error *ngIf="employeeForm.get('phone')?.hasError('required')">
                Телефон обязателен
              </mat-error>
              <mat-error *ngIf="employeeForm.get('phone')?.hasError('pattern')">
                Неверный формат телефона
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Дата рождения</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="birthDate" required>
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <mat-error *ngIf="employeeForm.get('birthDate')?.hasError('required')">
                Дата рождения обязательна
              </mat-error>
            </mat-form-field>
          </div>

          <div class="photo-upload">
            <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" style="display: none">
            <button type="button" mat-stroked-button (click)="fileInput.click()">
              <mat-icon>photo_camera</mat-icon>
              {{ selectedFile ? 'Изменить фото' : 'Добавить фото' }}
            </button>
            <div *ngIf="selectedFile" class="preview-container">
              <img [src]="previewUrl" alt="Preview" class="preview-image">
              <button type="button" mat-icon-button (click)="removePhoto()" class="remove-photo">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="onCancel()">Отмена</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="employeeForm.invalid || isSubmitting">
            {{ isSubmitting ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 20px;
      max-width: 600px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;

      mat-form-field {
        flex: 1;
      }
    }

    .photo-upload {
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .preview-container {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 4px;
      overflow: hidden;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-photo {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
    }

    mat-dialog-actions {
      padding: 16px 0 0;
      margin: 0;
    }
  `]
})
export class AddEmployeeDialogComponent {
  employeeForm: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddEmployeeDialogComponent>,
    private userService: UserService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.employeeForm = this.fb.group({
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      phone: ['', [Validators.required, Validators.pattern(/^7\d{10}$/)]],
      birthDate: ['', Validators.required]
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      this.isSubmitting = true;
      const formData = new FormData();

      // Добавляем все поля формы
      Object.keys(this.employeeForm.value).forEach(key => {
        if (key === 'birthDate') {
          formData.append(key, this.employeeForm.value[key].toISOString());
        } else {
          formData.append(key, this.employeeForm.value[key]);
        }
      });

      // Добавляем фото, если оно было выбрано
      if (this.selectedFile) {
        formData.append('profilePhoto', this.selectedFile);
      }

      this.userService.createUser(formData).subscribe({
        next: () => {
          this.snackBar.open('Сотрудник успешно добавлен', 'Закрыть', {
            duration: 3000
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Ошибка при создании сотрудника:', error);
          this.snackBar.open('Не удалось добавить сотрудника', 'Закрыть', {
            duration: 3000
          });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 