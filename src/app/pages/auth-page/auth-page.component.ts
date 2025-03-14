import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { provideNgxMask, NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent implements OnInit {
  phone: string = '+7';
  code: string = '';
  isCodeSent: boolean = false;
  errorMessage: string = '';
  timeLeft: number = 0;
  canResend: boolean = true;

  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Если пользователь уже авторизован, перенаправляем его
    if (this.authService.getToken()) {
      this.router.navigate(['/app']);
    }
  }

  handlePhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    // Если начинается с 7, удаляем эту цифру
    if (value.startsWith('7')) {
      value = value.substring(1);
    }

    // Всегда добавляем +7 в начало
    this.phone = '+7' + value;
  }

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }

  private getCleanPhone(): string {
    // Убираем все нецифровые символы и добавляем 7 в начало, если его нет
    let cleaned = this.phone.replace(/\D/g, '');
    if (cleaned.length > 0 && cleaned[0] !== '7') {
      cleaned = '7' + cleaned;
    }
    return cleaned;
  }

  requestCode(): void {
    const cleanPhone = this.getCleanPhone();
    
    if (cleanPhone.length !== 11) {
      this.errorMessage = 'Введите корректный номер телефона';
      return;
    }

    this.authService.requestCode(cleanPhone).subscribe({
      next: (response) => {
        this.isCodeSent = true;
        this.errorMessage = '';
        this.startTimer(response.timeLeft || 120);
      },
      error: (error) => {
        if (error.error.timeLeft) {
          this.errorMessage = error.error.message;
          this.startTimer(error.error.timeLeft);
        } else {
          this.errorMessage = 'Произошла ошибка при отправке кода';
        }
      }
    });
  }

  resendCode(): void {
    if (!this.canResend) return;

    const cleanPhone = this.getCleanPhone();
    this.authService.resendCode(cleanPhone).subscribe({
      next: (response) => {
        this.errorMessage = '';
        this.startTimer(response.timeLeft || 120);
      },
      error: (error) => {
        if (error.error.timeLeft) {
          this.errorMessage = error.error.message;
          this.startTimer(error.error.timeLeft);
        } else {
          this.errorMessage = 'Произошла ошибка при повторной отправке кода';
        }
      }
    });
  }

  verifyCode(): void {
    if (!this.code) {
      this.errorMessage = 'Введите код подтверждения';
      return;
    }

    const cleanPhone = this.getCleanPhone();
    this.authService.verifyCode(cleanPhone, this.code).subscribe({
      next: (response) => {
        this.authService.setToken(response.token);
        this.router.navigate(['/app']);
      },
      error: (error) => {
        this.errorMessage = error.error.message || 'Неверный код подтверждения';
      }
    });
  }

  private startTimer(seconds: number): void {
    this.timeLeft = seconds;
    this.canResend = false;
    
    const timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(timer);
        this.canResend = true;
      }
    }, 1000);
  }
}
