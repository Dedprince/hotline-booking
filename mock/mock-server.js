const express = require('express');
const app = express();
app.use(express.json());

// фиктивная "живая сессия" для PC-02 (имитирует занятого гостя)
const sessionStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
const sessionEnd = new Date(Date.now() + 45 * 60 * 1000).toISOString();

let computers = [
  { id: 1, name: "PC-01", status: "AVAILABLE" },
  { id: 2, name: "PC-02", status: "BUSY", currentUser: "Алексей", sessionStart, sessionEnd },
  { id: 3, name: "PC-03", status: "AVAILABLE" },
];

let bookings = [];
let nextBookingId = 1;

// ПК — с активными бронями и живыми сессиями
app.get('/api/computers', (req, res) => {
  const now = new Date();
  const enriched = computers.map(pc => {
    const result = { ...pc };

    // если есть активная бронь — статус BOOKED + данные о ней
    const active = bookings.find(b =>
      b.computerId === pc.id &&
      b.status === 'CONFIRMED' &&
      new Date(b.endTime) > now
    );
    if (active) {
      result.status = 'BOOKED';
      result.activeBooking = {
        id: active.id,
        startTime: active.startTime,
        endTime: active.endTime,
        bookedBy: active.bookedBy || 'Клиент',
      };
    }
    return result;
  });
  res.json(enriched);
});

// Список броней
app.get('/api/bookings', (req, res) => {
  const enriched = bookings.map(b => {
    const pc = computers.find(c => c.id === b.computerId);
    return { ...b, computerName: pc ? pc.name : `PC #${b.computerId}` };
  });
  res.json(enriched);
});

// Создание брони
app.post('/api/bookings', (req, res) => {
  const { computerId, startTime, endTime, bookedBy } = req.body;
  if (!computerId || !startTime || !endTime) {
    return res.status(400).json({ error: "Необходимо указать computerId, startTime, endTime" });
  }
  const newBooking = {
    id: nextBookingId++,
    computerId,
    startTime,
    endTime,
    status: "CONFIRMED",
    bookedBy: bookedBy || "Клиент",
  };
  bookings.push(newBooking);
  res.status(201).json(newBooking);
});

// Отмена брони
app.delete('/api/bookings/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Бронь не найдена" });
  }
  const [removed] = bookings.splice(idx, 1);
  res.json({ ok: true, removed });
});

app.listen(3001, () => {
  console.log('Mock Gizmo API running on http://localhost:3001');
});