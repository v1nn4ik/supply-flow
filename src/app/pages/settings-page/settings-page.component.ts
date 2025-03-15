import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  lastName: string = '';
  firstName: string = '';
  middleName: string = '';
  birthDate: string = '';
  maxDate: string;
  
  successMessage: string = '';
  errorMessage: string = '';
  private userDataSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    // Форматируем текущую дату в формат YYYY-MM-DD для ограничения поля ввода
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];
  }

  ngOnInit() {
    // Подписываемся на изменения данных пользователя
    this.userDataSubscription = this.userService.userData$.subscribe(userData => {
      if (userData) {
        this.lastName = userData.lastName;
        this.firstName = userData.firstName;
        this.middleName = userData.middleName || '';
        this.birthDate = userData.birthDate || '';
      }
    });

    // Принудительно загружаем актуальные данные с сервера
    this.userService.loadUserData();
  }

  ngOnDestroy() {
    // Отписываемся при уничтожении компонента
    if (this.userDataSubscription) {
      this.userDataSubscription.unsubscribe();
    }
  }

  saveChanges() {
    if (!this.isFormValid()) {
      return;
    }

    try {
      const updatedUserData = {
        lastName: this.capitalizeFirstLetter(this.lastName.trim()),
        firstName: this.capitalizeFirstLetter(this.firstName.trim()),
        middleName: this.middleName.trim() ? this.capitalizeFirstLetter(this.middleName.trim()) : '',
        birthDate: this.birthDate
      };
      
      this.userService.setUserData(updatedUserData);
      this.successMessage = 'Данные успешно сохранены';
      this.errorMessage = '';

      // Обновляем значения полей отформатированными данными
      this.lastName = updatedUserData.lastName;
      this.firstName = updatedUserData.firstName;
      this.middleName = updatedUserData.middleName;
    } catch (error) {
      this.errorMessage = 'Произошла ошибка при сохранении данных';
      this.successMessage = '';
    }
  }

  private isFormValid(): boolean {
    // Проверка на пустые поля
    if (!this.lastName.trim() || !this.firstName.trim()) {
      this.errorMessage = 'Пожалуйста, заполните все обязательные поля';
      this.successMessage = '';
      return false;
    }

    // Проверка формата фамилии (одно или два слова через дефис)
    const lastNamePattern = /^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?$/;
    if (!lastNamePattern.test(this.lastName.trim())) {
      this.errorMessage = 'Фамилия должна содержать одно слово или два слова через дефис, начинаться с заглавной буквы и содержать только русские буквы';
      this.successMessage = '';
      return false;
    }

    // Проверка формата имени (одно слово)
    const namePattern = /^[А-ЯЁ][а-яё]+$/;
    if (!namePattern.test(this.firstName.trim())) {
      this.errorMessage = 'Имя должно начинаться с заглавной буквы и содержать только русские буквы';
      this.successMessage = '';
      return false;
    }

    // Проверка формата отчества (одно слово)
    if (this.middleName.trim() && !namePattern.test(this.middleName.trim())) {
      this.errorMessage = 'Отчество должно начинаться с заглавной буквы и содержать только русские буквы';
      this.successMessage = '';
      return false;
    }

    // Проверка длины отдельных полей
    if (this.lastName.trim().length > 25) {
      this.errorMessage = 'Длина фамилии не должна превышать 25 символов';
      this.successMessage = '';
      return false;
    }

    if (this.firstName.trim().length > 15) {
      this.errorMessage = 'Длина имени не должна превышать 15 символов';
      this.successMessage = '';
      return false;
    }

    if (this.middleName.trim().length > 15) {
      this.errorMessage = 'Длина отчества не должна превышать 15 символов';
      this.successMessage = '';
      return false;
    }

    // Проверка общей длины ФИО
    const totalLength = this.lastName.trim().length + 
                       this.firstName.trim().length + 
                       this.middleName.trim().length;
    
    if (totalLength > 38) {
      this.errorMessage = 'Общая длина ФИО не должна превышать 38 символов';
      this.successMessage = '';
      return false;
    }

    // Проверка даты рождения
    if (this.birthDate) {
      const selectedDate = new Date(this.birthDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Сбрасываем время до начала дня
      
      if (selectedDate > today) {
        this.errorMessage = 'Дата рождения не может быть позже текущей даты';
        this.successMessage = '';
        return false;
      }
    }

    return true;
  }

  private capitalizeFirstLetter(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  logout(): void {
    this.authService.logout();
    this.userService.clearUserData();
    this.router.navigate(['/auth']);
  }
}
