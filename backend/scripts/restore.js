const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../backups');
const MONGODB_URI = process.env.MONGODB_URI;

// Функция для восстановления из бэкапа
const restoreFromBackup = (backupPath) => {
    if (!fs.existsSync(backupPath)) {
        console.error(`Бэкап не найден: ${backupPath}`);
        return;
    }

    // Команда для восстановления
    const command = `mongorestore --uri="${MONGODB_URI}" --drop "${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка при восстановлении: ${error}`);
            return;
        }
        console.log(`База данных успешно восстановлена из бэкапа: ${backupPath}`);
    });
};

// Получаем путь к последнему бэкапу
const getLatestBackup = () => {
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('backup-'))
        .sort()
        .reverse();

    if (backups.length === 0) {
        console.error('Бэкапы не найдены');
        return null;
    }

    return path.join(BACKUP_DIR, backups[0]);
};

// Восстанавливаем из последнего бэкапа
const latestBackup = getLatestBackup();
if (latestBackup) {
    console.log(`Восстановление из последнего бэкапа: ${latestBackup}`);
    restoreFromBackup(latestBackup);
} 