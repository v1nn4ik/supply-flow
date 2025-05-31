const Supply = require('../models/supply.model');
const User = require('../models/user.model');
const ROLES = require('../constants/roles');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Создаем абсолютный путь к директории загрузки
    const uploadDir = path.join(__dirname, '..', 'uploads', 'supply');
    console.log(`Директория для загрузки файлов заявок: ${uploadDir}`);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Создана директория: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Генерируем имя файла
    const fileName = Date.now() + '-' + file.originalname;
    console.log(`Генерируем имя файла: ${fileName}`);
    cb(null, fileName);
  }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
  // Принимаем все типы файлов
  cb(null, true);
};

// Настройка multer с ограничением размера файла в 7МБ
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 7 * 1024 * 1024 // 7 МБ в байтах
  }
});

// Экспортируем multer для использования в маршрутах
exports.upload = upload;

exports.createSupply = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Получаем информацию о пользователе
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const userName = `${user.lastName || ''} ${user.firstName || ''}`.trim() || "Пользователь";

    const supply = new Supply({
      ...req.body,
      createdBy: {
        userId: userId,
        name: userName
      }
    });

    // Если статус новый, все предметы должны быть не куплены
    if (supply.status === 'new') {
      supply.items = supply.items.map(item => ({
        ...item,
        purchased: false
      }));
    }

    await supply.save();

    // Отправляем уведомление об обновлении
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate(supply);
    }

    res.status(201).json(supply);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getSupplies = async (req, res) => {
  try {
    const supplies = await Supply.find().sort({ createdAt: -1 });
    res.json(supplies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMySupplies = async (req, res) => {
  try {
    const userId = req.user.userId;
    const supplies = await Supply.find({ 'createdBy.userId': userId }).sort({ createdAt: -1 });
    res.json(supplies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSupplyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Проверка прав для установки статуса "Завершена"
    if (status === 'finalized' &&
      req.user.role !== ROLES.ADMIN &&
      req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        message: 'Только администратор или руководитель могут установить статус "Завершена"'
      });
    }

    // Проверка прав для отмены заявки (статус "Отменена")
    if (status === 'cancelled' &&
      req.user.role !== ROLES.ADMIN &&
      req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        message: 'Только администратор или руководитель могут отменить заявку'
      });
    }

    // Если статус новый, все предметы должны быть не куплены
    if (status === 'new') {
      const supply = await Supply.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: status,
            updatedAt: Date.now(),
            'items.$[].purchased': false
          }
        },
        { new: true }
      );

      if (!supply) {
        return res.status(404).json({ message: 'Заявка не найдена' });
      }

      // Отправляем уведомление об обновлении
      const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
      if (emitSupplyUpdate) {
        emitSupplyUpdate(supply);
      }

      return res.json(supply);
    }

    // Для других статусов обновляем только статус
    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: status,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Отправляем уведомление об обновлении
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate(supply);
    }

    res.json(supply);
  } catch (error) {
    console.error('Error updating supply status:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateSupply = async (req, res) => {
  try {
    // Сначала найдем заявку, чтобы проверить ее текущий статус
    const existingSupply = await Supply.findById(req.params.id);

    if (!existingSupply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Проверяем статус: редактировать можно только заявки со статусом 'new'
    if (existingSupply.status !== 'new') {
      return res.status(400).json({ message: 'Редактировать можно только заявки со статусом "Новая"' });
    }

    // Проверка прав для установки статуса "Завершена"
    if (req.body.status === 'finalized' &&
      req.user.role !== ROLES.ADMIN &&
      req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        message: 'Только администратор или руководитель могут установить статус "Завершена"'
      });
    }

    // Проверка прав для отмены заявки (статус "Отменена")
    if (req.body.status === 'cancelled' &&
      req.user.role !== ROLES.ADMIN &&
      req.user.role !== ROLES.MANAGER) {
      return res.status(403).json({
        message: 'Только администратор или руководитель могут отменить заявку'
      });
    }

    // Получаем поля для обновления из тела запроса, исключая items и другие поля, которые могут обрабатываться отдельно
    const updateFields = { ...req.body };
    delete updateFields.items;
    // Можно также удалить статус, так как он обрабатывается отдельно в ветке ниже
    delete updateFields.status;

    let updateObject = {
      $set: {
        ...updateFields,
        updatedAt: Date.now()
      }
    };

    // Если в теле запроса есть items, добавляем их в $set
    if (req.body.items) {
      updateObject.$set.items = req.body.items;
    }

    // Если статус меняется на new, сбрасываем purchased для всех предметов
    if (req.body.status === 'new') {
      updateObject.$set.status = 'new';
      // Используем $[] для сброса всех purchased в массиве items
      // Убедимся, что items.$[].purchased добавляется только один раз и не конфликтует с заменой всего массива
      // Если мы заменяем весь массив items, нет необходимости сбрасывать purchased отдельно
      // Если req.body.items не предоставлен, но статус меняется на new, мы должны сбросить purchased в существующем массиве
      // В данном случае, фронтенд всегда отправляет items, так что просто убедимся, что в отправленном массиве purchased === false для нового статуса.
      // Фронтенд уже должен был установить purchased в false при переходе в режим редактирования для статуса new.
      // Таким образом, нам не нужно дополнительно использовать 'items.$[].purchased': false здесь, если мы заменяем весь массив.

      // Если статус явно установлен в new в теле запроса
      if (req.body.status === 'new') {
        updateObject.$set.status = 'new';
        // Так как мы заменяем весь массив items, ожидается, что purchased уже установлен в false фронтендом для этого случая
        // Если нет items в body, но статус new, сбрасываем purchased в текущем массиве
        if (!req.body.items) {
          updateObject.$set['items.$[].purchased'] = false;
          updateObject.arrayFilters = [{}]; // Пустой фильтр для применения ко всем элементам
        }
      }
    }

    // Для других статусов просто обновляем статус, если он есть в body
    if (req.body.status && req.body.status !== 'new') {
      updateObject.$set.status = req.body.status;
    }

    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      updateObject,
      { new: true }
    );

    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Отправляем уведомление об обновлении
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate(supply);
    }

    res.json(supply);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSupply = async (req, res) => {
  try {
    // Сначала найдем заявку, чтобы получить ее ID
    const supply = await Supply.findById(req.params.id);
    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Находим все комментарии связанные с этой заявкой
    const Comment = require('../models/comment.model');
    const comments = await Comment.find({ supplyId: supply._id });

    console.log(`Удаление заявки ID: ${supply._id}, найдено ${comments.length} комментариев`);

    // Удаляем файлы всех вложений в комментариях
    for (const comment of comments) {
      if (comment.attachment && comment.attachment.url) {
        try {
          // Используем абсолютный путь для удаления файла
          const absolutePath = path.resolve(__dirname, '..', comment.attachment.url);
          console.log(`Попытка удаления файла: ${absolutePath}`);

          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`✓ Успешно удален файл: ${absolutePath}`);
          } else {
            console.log(`✗ Файл не существует: ${absolutePath}`);

            // Попробуем найти файл относительно корня сервера
            const alternativePath = path.resolve(comment.attachment.url);
            if (fs.existsSync(alternativePath)) {
              fs.unlinkSync(alternativePath);
              console.log(`✓ Успешно удален файл (альтернативный путь): ${alternativePath}`);
            } else {
              console.log(`✗ Файл не существует (альтернативный путь): ${alternativePath}`);
            }
          }
        } catch (err) {
          console.error(`Ошибка при удалении файла комментария ${comment._id}:`, err);
        }
      }
    }

    // Удаляем все комментарии, связанные с заявкой
    const deleteResult = await Comment.deleteMany({ supplyId: supply._id });
    console.log(`Удалены комментарии: ${deleteResult.deletedCount} для заявки ${supply._id}`);

    // Удаляем файлы вложений заявки, если они есть
    if (supply.attachments && supply.attachments.length > 0) {
      console.log(`Найдено ${supply.attachments.length} вложений для удаления`);

      for (const attachment of supply.attachments) {
        if (attachment.url) {
          try {
            // Используем абсолютный путь для удаления файла
            const absolutePath = path.resolve(__dirname, '..', attachment.url);
            console.log(`Попытка удаления вложения: ${absolutePath}`);

            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
              console.log(`✓ Успешно удалено вложение: ${absolutePath}`);
            } else {
              console.log(`✗ Вложение не существует: ${absolutePath}`);

              // Попробуем найти файл относительно корня сервера
              const alternativePath = path.resolve(attachment.url);
              if (fs.existsSync(alternativePath)) {
                fs.unlinkSync(alternativePath);
                console.log(`✓ Успешно удалено вложение (альтернативный путь): ${alternativePath}`);
              } else {
                console.log(`✗ Вложение не существует (альтернативный путь): ${alternativePath}`);
              }
            }
          } catch (err) {
            console.error(`Ошибка при удалении вложения:`, err);
          }
        }
      }
    }

    // Теперь удаляем саму заявку
    await Supply.findByIdAndDelete(req.params.id);
    console.log(`Удалена заявка ID: ${supply._id}`);

    // Отправляем уведомление об удалении
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate({ ...supply.toObject(), deleted: true });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Ошибка при удалении заявки:', error);
    res.status(500).json({ message: error.message });
  }
};

// Загрузить файл для заявки
exports.uploadAttachment = async (req, res) => {
  try {
    const supplyId = req.params.supplyId;
    const file = req.file;
    const userId = req.user.userId;

    if (!file) {
      return res.status(400).json({ message: 'Файл не был загружен' });
    }

    console.log(`Получен файл: ${file.originalname}, размер: ${file.size} байт, путь: ${file.path}`);

    // Создаем относительный путь для хранения в БД и доступа через веб
    const relativePath = 'uploads/supply/' + path.basename(file.path);
    console.log(`Сохраняем относительный путь: ${relativePath}`);

    const attachment = {
      name: file.originalname,
      url: relativePath,
      type: file.mimetype,
      size: file.size,
      uploadedBy: userId
    };

    const updatedSupply = await Supply.findByIdAndUpdate(
      supplyId,
      { $push: { attachments: attachment } },
      { new: true }
    );

    if (!updatedSupply) {
      // Удаляем файл, если заявка не найдена
      fs.unlinkSync(file.path);
      console.log(`Файл удален, так как заявка не найдена: ${file.path}`);
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    console.log(`Файл успешно прикреплен к заявке ${supplyId}: ${attachment.name}`);

    // Отправляем уведомление через WebSocket
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate(updatedSupply);
    }

    res.json(updatedSupply);
  } catch (error) {
    // В случае ошибки удаляем загруженный файл
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Удален временный файл после ошибки: ${req.file.path}`);
      } catch (unlinkError) {
        console.error('Ошибка при удалении файла:', unlinkError);
      }
    }
    console.error('Ошибка при загрузке файла:', error);
    res.status(500).json({ message: 'Ошибка при загрузке файла' });
  }
};

// Удалить вложение из заявки
exports.deleteAttachment = async (req, res) => {
  try {
    const { supplyId, attachmentId } = req.params;

    const supply = await Supply.findById(supplyId);
    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Находим вложение
    const attachment = supply.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Вложение не найдено' });
    }

    // Удаляем файл с диска
    try {
      fs.unlinkSync(attachment.url);
    } catch (err) {
      console.error('Ошибка при удалении файла:', err);
    }

    // Удаляем вложение из массива
    supply.attachments.pull(attachmentId);
    await supply.save();

    // Отправляем уведомление об обновлении
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate(supply);
    }

    res.json(supply);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении вложения' });
  }
}; 