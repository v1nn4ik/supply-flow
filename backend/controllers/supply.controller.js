const Supply = require('../models/supply.model');

exports.createSupply = async (req, res) => {
  try {
    const supply = new Supply(req.body);
    await supply.save();
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
    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    res.json(supply);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateSupply = async (req, res) => {
  try {
    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!supply) {
      return res.status(404).json({ message: 'Заявка не найдена' });
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
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 