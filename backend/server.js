require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const gizmo = axios.create({
  baseURL: process.env.GIZMO_BASE_URL,
  auth: {
    username: process.env.GIZMO_LOGIN,
    password: process.env.GIZMO_PASSWORD
  },
  timeout: 10000
});

// ПК
app.get('/api/computers', async (req, res) => {
  try {
    const response = await gizmo.get('/api/computers');
    res.json(response.data);
  } catch (error) {
    console.error('Gizmo API error (computers):', error.message);
    res.status(error.response?.status || 502).json({ error: 'Не удалось получить список компьютеров' });
  }
});

// Список броней
app.get('/api/bookings', async (req, res) => {
  try {
    const response = await gizmo.get('/api/bookings');
    res.json(response.data);
  } catch (error) {
    console.error('Gizmo API error (bookings):', error.message);
    res.status(error.response?.status || 502).json({ error: 'Не удалось получить список броней' });
  }
});

// Создание брони
app.post('/api/bookings', async (req, res) => {
  try {
    const response = await gizmo.post('/api/bookings', req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Gizmo API error (create booking):', error.message);
    res.status(error.response?.status || 502).json({ error: 'Не удалось создать бронирование' });
  }
});

// Отмена брони
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const response = await gizmo.delete(`/api/bookings/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Gizmo API error (cancel booking):', error.message);
    res.status(error.response?.status || 502).json({ error: 'Не удалось отменить бронирование' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT}`);
});