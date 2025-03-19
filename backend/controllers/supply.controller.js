const Supply = require('../models/supply.model');
const User = require('../models/user.model');

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

exports.updateSupplyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
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
    // Если статус новый, все предметы должны быть не куплены
    if (req.body.status === 'new') {
      const supply = await Supply.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            ...req.body,
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

    // Для других статусов обновляем как обычно
    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
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
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSupply = async (req, res) => {
  try {
    const supply = await Supply.findByIdAndDelete(req.params.id);
    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Отправляем уведомление об удалении
    const emitSupplyUpdate = req.app.get('emitSupplyUpdate');
    if (emitSupplyUpdate) {
      emitSupplyUpdate({ ...supply.toObject(), deleted: true });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 