import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { provideNgxMask, NgxMaskDirective } from 'ngx-mask';

@Component({
	selector: 'app-auth-page',
	standalone: true,
	imports: [CommonModule, FormsModule, NgxMaskDirective],
	providers: [provideNgxMask()],
	templateUrl: './auth-page.component.html',
	styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent implements OnInit, OnDestroy {
	phone: string = '';
	code: string = '';
	lastName: string = '';
	firstName: string = '';
	middleName: string = '';
	birthDate: string = '';
	maxDate: string;
	isCodeSent: boolean = false;
	errorMessage: string = '';
	timeLeft: number = 0;
	canResend: boolean = true;
	hasExistingUserData: boolean = false;
	private timerInterval: any;

	constructor(
		private router: Router,
		public authService: AuthService,
		private userService: UserService,
		private cdr: ChangeDetectorRef,
		private ngZone: NgZone
	) {
		// Устанавливаем максимальную дату как текущую
		const today = new Date();
		this.maxDate = today.toISOString().split('T')[0];
	}

	ngOnInit() {
		if (this.authService.getToken()) {
			this.router.navigate(['/app']);
			return;
		}

		// Проверяем, есть ли сохраненные данные о таймере
		this.checkSavedTimer();
	}

	private checkSavedTimer(): void {
		const savedPhone = localStorage.getItem('phoneNumber');
		const timerEndTime = localStorage.getItem('timerEndTime');
		const savedCodeSent = localStorage.getItem('isCodeSent');

		// Проверяем валидность данных в localStorage и сроки их действия
		if (savedPhone && timerEndTime && savedCodeSent === 'true') {
			const endTime = parseInt(timerEndTime);
			const currentTime = new Date().getTime();
			const remainingTime = Math.floor((endTime - currentTime) / 1000);

			// Если таймер истек или неправильные данные, сбрасываем состояние
			if (remainingTime <= 0 || isNaN(endTime)) {
				this.resetTimerState();
				return;
			}

			// Если таймер еще действует, восстанавливаем состояние
			this.phone = savedPhone;
			this.isCodeSent = true;
			this.timeLeft = remainingTime;
			this.canResend = false;
			this.startTimer(remainingTime);
		} else {
			// Если в localStorage нет полных данных, сбрасываем состояние
			this.resetTimerState();
		}
	}

	// Добавляем метод для сброса состояния таймера
	private resetTimerState(): void {
		this.isCodeSent = false;
		this.canResend = true;
		this.timeLeft = 0;
		localStorage.removeItem('timerEndTime');
		localStorage.removeItem('phoneNumber');
		localStorage.removeItem('isCodeSent');
	}

	private getCleanPhone(): string {
		const digits = this.phone.replace(/\D/g, '');
		return `7${digits}`;
	}

	requestCode() {
		const cleanPhone = this.getCleanPhone();
		if (cleanPhone.length !== 11) {
			this.errorMessage = 'Введите корректный номер телефона';
			return;
		}

		// Сначала проверяем, есть ли данные пользователя
		this.authService.checkUser(cleanPhone).subscribe({
			next: (response) => {
				this.hasExistingUserData = response.hasUserData;

				// После проверки отправляем код
				this.authService.requestCode(cleanPhone).subscribe({
					next: (response) => {
						// Проверяем, является ли пользователь админом
						if (response.token) {
							// Если это админ, сразу авторизуем и перенаправляем
							this.authService.setToken(response.token);
							this.userService.loadUserData();
							this.router.navigate(['/app']);
							return;
						}

						// Для обычных пользователей
						this.isCodeSent = true;
						this.errorMessage = '';
						if (response.timeLeft) {
							this.startTimer(response.timeLeft);
						}
					},
					error: (error) => {
						this.errorMessage = error.error.message || 'Произошла ошибка при отправке кода';
					}
				});
			},
			error: (error) => {
				this.errorMessage = error.error.message || 'Произошла ошибка при проверке пользователя';
			}
		});
	}

	resendCode() {
		if (!this.canResend) {
			return;
		}

		const cleanPhone = this.getCleanPhone();
		this.authService.resendCode(cleanPhone).subscribe({
			next: (response) => {
				this.errorMessage = '';
				if (response.timeLeft) {
					this.startTimer(response.timeLeft);
				}
			},
			error: (error) => {
				this.errorMessage = error.error.message || 'Произошла ошибка при повторной отправке кода';
			}
		});
	}

	verifyCode() {
		const cleanPhone = this.getCleanPhone();

		// Проверяем валидность кода
		if (this.code.length !== 6) {
			this.errorMessage = 'Введите корректный код подтверждения';
			return;
		}

		// Проверяем валидность имени и фамилии для новых пользователей
		if (!this.hasExistingUserData) {
			if (!this.isFormValid()) {
				return;
			}
		}

		const verificationData = {
			phone: cleanPhone,
			code: this.code,
			...((!this.hasExistingUserData && {
				lastName: this.capitalizeFirstLetter(this.lastName.trim()),
				firstName: this.capitalizeFirstLetter(this.firstName.trim()),
				middleName: this.middleName.trim() ? this.capitalizeFirstLetter(this.middleName.trim()) : ''
			}))
		};

		this.authService.verifyCode(verificationData).subscribe({
			next: (response) => {
				this.authService.setToken(response.token);
				this.userService.loadUserData();
				this.router.navigate(['/app']);
			},
			error: (error) => {
				this.errorMessage = error.error.message || 'Произошла ошибка при проверке кода';
			}
		});
	}

	private isFormValid(): boolean {
		if (!this.lastName.trim() || !this.firstName.trim()) {
			this.errorMessage = 'Пожалуйста, заполните обязательные поля';
			return false;
		}

		// Проверка формата фамилии (одно или два слова через дефис)
		const lastNamePattern = /^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?$/;
		if (!lastNamePattern.test(this.lastName.trim())) {
			this.errorMessage = 'Фамилия должна содержать одно слово или два слова через дефис, начинаться с заглавной буквы и содержать только русские буквы';
			return false;
		}

		// Проверка формата имени (одно слово)
		const namePattern = /^[А-ЯЁ][а-яё]+$/;
		if (!namePattern.test(this.firstName.trim())) {
			this.errorMessage = 'Имя должно начинаться с заглавной буквы и содержать только русские буквы';
			return false;
		}

		// Проверка формата отчества (одно слово)
		if (this.middleName.trim() && !namePattern.test(this.middleName.trim())) {
			this.errorMessage = 'Отчество должно начинаться с заглавной буквы и содержать только русские буквы';
			return false;
		}

		// Проверка длины отдельных полей
		if (this.lastName.trim().length > 25) {
			this.errorMessage = 'Длина фамилии не должна превышать 25 символов';
			return false;
		}

		if (this.firstName.trim().length > 15) {
			this.errorMessage = 'Длина имени не должна превышать 15 символов';
			return false;
		}

		if (this.middleName.trim().length > 15) {
			this.errorMessage = 'Длина отчества не должна превышать 15 символов';
			return false;
		}

		// Проверка общей длины ФИО
		const totalLength = this.lastName.trim().length +
			this.firstName.trim().length +
			this.middleName.trim().length;

		if (totalLength > 38) {
			this.errorMessage = 'Общая длина ФИО не должна превышать 38 символов';
			return false;
		}

		return true;
	}

	private capitalizeFirstLetter(str: string): string {
		if (!str) return '';
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	private startTimer(seconds: number): void {
		// Очищаем предыдущий интервал, если он был
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}

		this.timeLeft = seconds;
		this.canResend = false;

		// Сохраняем время окончания таймера
		const endTime = new Date().getTime() + seconds * 1000;
		localStorage.setItem('timerEndTime', endTime.toString());
		localStorage.setItem('phoneNumber', this.phone);
		localStorage.setItem('isCodeSent', 'true');

		this.ngZone.runOutsideAngular(() => {
			this.timerInterval = setInterval(() => {
				this.ngZone.run(() => {
					this.timeLeft--;

					if (this.timeLeft <= 0) {
						clearInterval(this.timerInterval);
						this.canResend = true;
						localStorage.removeItem('timerEndTime');
					}
				});
			}, 1000);
		});
	}

	logout(): void {
		this.authService.logout();
		this.userService.clearUserData();
		// Очищаем данные таймера при выходе
		this.resetTimerState();
		window.location.reload();
	}

	ngOnDestroy(): void {
		// Очищаем интервал при уничтожении компонента
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}
	}
}
