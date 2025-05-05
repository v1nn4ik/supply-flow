const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../backups');
const MONGODB_URI = process.env.MONGODB_URI;

// Создаем директорию для бэкапов, если её нет
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Функция для создания бэкапа
const createBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

    // Извлекаем имя базы данных из URI
    const dbName = MONGODB_URI.split('/').pop().split('?')[0];
    
    // Команда для создания бэкапа
    const command = `mongodump --uri="${MONGODB_URI}" --out="${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка при создании бэкапа: ${error}`);
            return;
        }
        console.log(`Бэкап успешно создан: ${backupPath}`);
        
        // Удаляем старые бэкапы (оставляем только последние 7)
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('backup-'))
            .sort()
            .reverse();
            
        if (backups.length > 7) {
            backups.slice(7).forEach(oldBackup => {
                const oldBackupPath = path.join(BACKUP_DIR, oldBackup);
                fs.rmSync(oldBackupPath, { recursive: true, force: true });
                console.log(`Удален старый бэкап: ${oldBackupPath}`);
            });
        }
    });
};

// Создаем бэкап при запуске
createBackup();

// Настраиваем автоматическое создание бэкапов каждый день в 3:00
cron.schedule('0 3 * * *', () => {
    console.log('Запуск автоматического бэкапа...');
    createBackup();
}); 