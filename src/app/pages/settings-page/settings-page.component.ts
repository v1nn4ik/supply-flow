import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-settings-page',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		MatDatepickerModule,
		MatInputModule,
		MatFormFieldModule,
		MatNativeDateModule,
		MatCardModule,
		MatButtonModule,
		MatChipsModule,
		MatDividerModule,
		MatIconModule
	],
	templateUrl: './settings-page.component.html',
	styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent implements OnInit, OnDestroy {
	lastName: string = '';
	firstName: string = '';
	middleName: string = '';
	birthDate: string = '';
	profilePhoto: string | null = null;
	maxDate: string;

	successMessage: string = '';
	errorMessage: string = '';
	photoSuccessMessage: string = '';
	photoErrorMessage: string = '';

	serverUrl: string = 'http://localhost:3000'; // URL сервера для полного пути к изображениям
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
				this.profilePhoto = userData.profilePhoto || null;
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
				birthDate: this.birthDate,
				profilePhoto: this.profilePhoto
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

	onPhotoSelected(event: Event) {
		const input = event.target as HTMLInputElement;

		if (input.files && input.files.length) {
			const file = input.files[0];

			// Проверка типа файла
			if (!file.type.startsWith('image/')) {
				this.photoErrorMessage = 'Пожалуйста, выберите файл изображения.';
				this.photoSuccessMessage = '';
				return;
			}

			// Проверка размера файла (5MB максимум)
			if (file.size > 5 * 1024 * 1024) {
				this.photoErrorMessage = 'Размер файла не должен превышать 5MB.';
				this.photoSuccessMessage = '';
				return;
			}

			// Очищаем предыдущие сообщения
			this.photoErrorMessage = '';
			this.photoSuccessMessage = '';

			this.userService.uploadProfilePhoto(file)
				.then(photoUrl => {
					this.profilePhoto = photoUrl;
					this.photoSuccessMessage = 'Фото профиля успешно загружено';

					// Сбрасываем input, чтобы позволить загрузить тот же файл повторно
					input.value = '';
				})
				.catch(error => {
					this.photoErrorMessage = error || 'Ошибка при загрузке фото';

					// Сбрасываем input, чтобы позволить загрузить тот же файл повторно
					input.value = '';
				});
		}
	}

	deletePhoto() {
		if (!this.profilePhoto) return;

		this.userService.deleteProfilePhoto()
			.then(() => {
				this.profilePhoto = null;
				this.photoSuccessMessage = 'Фото профиля успешно удалено';
				this.photoErrorMessage = '';
			})
			.catch(error => {
				this.photoErrorMessage = error || 'Ошибка при удалении фото';
				this.photoSuccessMessage = '';
			});
	}

	getInitials(): string {
		let initials = '';

		if (this.firstName) {
			initials += this.firstName.charAt(0);
		}

		if (this.lastName) {
			initials += this.lastName.charAt(0);
		}

		return initials.toUpperCase();
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
