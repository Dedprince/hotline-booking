import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API = 'https://hotline-backend-na6u.onrender.com';

const STATUS_LABEL = {
  AVAILABLE: 'Свободен',
  BUSY: 'Занят',
  BOOKED: 'Забронирован',
  OFFLINE: 'Выключен',
};

const STATUS_CLASS = {
  AVAILABLE: 'status-available',
  BUSY: 'status-busy',
  BOOKED: 'status-booked',
  OFFLINE: 'status-offline',
};

const STATUS_ORDER = { AVAILABLE: 0, BOOKED: 1, BUSY: 2, OFFLINE: 3 };

function pad(n) { return String(n).padStart(2, '0'); }

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatUntil(iso) {
  const d = new Date(iso);
  const now = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return `до ${time}`;
  return `до ${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
}

function formatDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function getRemaining(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'завершается';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `~${m} мин`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `~${h} ч ${r} мин` : `~${h} ч`;
}

function getProgress(from, to) {
  const now = Date.now();
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function getOccupancy(pc) {
  if (pc.activeBooking) {
    return {
      user: pc.activeBooking.bookedBy || 'Клиент',
      from: pc.activeBooking.startTime,
      to: pc.activeBooking.endTime,
    };
  }
  if (pc.status === 'BUSY' && pc.sessionEnd) {
    return {
      user: pc.currentUser || 'Гость',
      from: pc.sessionStart,
      to: pc.sessionEnd,
    };
  }
  return null;
}

export default function App() {
  const [tab, setTab] = useState('book');

  const [computers, setComputers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bookedBy, setBookedBy] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadComputers = useCallback(() => {
    axios.get(`${API}/api/computers`)
      .then(res => {
        setComputers(res.data);
        setLastUpdated(new Date());
        setError('');
      })
      .catch(() => setError('Не удалось загрузить список ПК'));
  }, []);

  const loadBookings = useCallback(() => {
    axios.get(`${API}/api/bookings`)
      .then(res => setBookings(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadComputers();
    const timer = setInterval(loadComputers, 10000);
    return () => clearInterval(timer);
  }, [loadComputers]);

  useEffect(() => {
    if (tab === 'my') loadBookings();
  }, [tab, loadBookings]);

  useEffect(() => {
    if (!selected) return;
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const toLocal = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setStartTime(toLocal(now));
    setEndTime(toLocal(inOneHour));
  }, [selected]);

  const handleBook = async () => {
    if (!selected) return;
    if (!startTime || !endTime) {
      setError('Укажите время начала и окончания');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/api/bookings`, {
        computerId: selected.id,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bookedBy: bookedBy.trim() || 'Клиент',
      });
      setSelected(null);
      setBookedBy('');
      loadComputers();
      alert('Бронирование создано!');
    } catch {
      setError('Не удалось забронировать. Попробуйте другое время.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Отменить эту бронь?')) return;
    try {
      await axios.delete(`${API}/api/bookings/${id}`);
      loadBookings();
      loadComputers();
    } catch {
      setError('Не удалось отменить бронь');
    }
  };

  const sortedComputers = [...computers].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99) || a.name.localeCompare(b.name)
  );

  const availableCount = computers.filter(c => c.status === 'AVAILABLE').length;
  const busyCount = computers.filter(c => c.status === 'BUSY' || c.status === 'BOOKED').length;

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-mark">🎮</span>
          <div>
            <div className="logo-title">HOTLINE CLASSIC</div>
            <div className="logo-subtitle">бронирование ПК</div>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{availableCount}</span>
            <span className="stat-label">свободно</span>
          </div>
          <div className="stat">
            <span className="stat-value">{busyCount}</span>
            <span className="stat-label">занято</span>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${tab === 'book' ? 'tab-active' : ''}`}
          onClick={() => setTab('book')}
        >
          🖥️ Бронирование
        </button>
        <button
          className={`tab ${tab === 'my' ? 'tab-active' : ''}`}
          onClick={() => setTab('my')}
        >
          📋 Мои брони
          {bookings.length > 0 && <span className="tab-count">{bookings.length}</span>}
        </button>
      </nav>

      {error && <div className="alert">{error}</div>}

      {tab === 'book' && (
        <>
          <section className="section">
            <div className="section-head">
              <h2>ПК в клубе</h2>
              <button className="btn-ghost" onClick={loadComputers} title="Обновить">
                ⟳ Обновить
              </button>
            </div>

            {computers.length === 0 ? (
              <div className="empty">Загрузка списка ПК…</div>
            ) : (
              <div className="grid">
                {sortedComputers.map(pc => {
                  const isAvailable = pc.status === 'AVAILABLE';
                  const isSelected = selected?.id === pc.id;
                  const occ = getOccupancy(pc);
                  return (
                    <button
                      key={pc.id}
                      className={`card ${isSelected ? 'card-selected' : ''} ${!isAvailable ? 'card-disabled' : ''}`}
                      onClick={() => isAvailable && setSelected(pc)}
                      disabled={!isAvailable}
                    >
                      <div className="card-top">
                        <span className="card-name">{pc.name}</span>
                        <span className={`badge ${STATUS_CLASS[pc.status] || 'status-offline'}`}>
                          {STATUS_LABEL[pc.status] || pc.status}
                        </span>
                      </div>

                      {occ ? (
                        <div className="card-occupancy">
                          <div className="occ-user">👤 {occ.user}</div>
                          <div className="occ-time">
                            {formatUntil(occ.to)} · {getRemaining(occ.to)}
                          </div>
                          <div className="progress">
                            <div
                              className="progress-fill"
                              style={{ width: `${getProgress(occ.from, occ.to)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="card-icon">🖥️</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {lastUpdated && (
              <div className="updated">
                Обновлено в {lastUpdated.toLocaleTimeString('ru-RU')} · автообновление каждые 10 секунд
              </div>
            )}
          </section>

          {selected && (
            <section className="section booking">
              <h2>Бронирование: <span className="accent">{selected.name}</span></h2>

              <div className="form-row">
                <label>
                  <span>Ваше имя</span>
                  <input
                    type="text"
                    placeholder="Необязательно"
                    value={bookedBy}
                    onChange={e => setBookedBy(e.target.value)}
                    maxLength={32}
                  />
                </label>
                <label>
                  <span>Начало</span>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </label>
                <label>
                  <span>Окончание</span>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="btn-primary" onClick={handleBook} disabled={loading}>
                  {loading ? 'Бронируем…' : 'Забронировать'}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => { setSelected(null); setBookedBy(''); }}
                  disabled={loading}
                >
                  Отмена
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {tab === 'my' && (
        <section className="section">
          <div className="section-head">
            <h2>Мои брони</h2>
            <button className="btn-ghost" onClick={loadBookings}>⟳ Обновить</button>
          </div>

          {bookings.length === 0 ? (
            <div className="empty">У вас пока нет броней</div>
          ) : (
            <div className="bookings">
              {bookings.map(b => (
                <div key={b.id} className="booking-item">
                  <div className="booking-main">
                    <div className="booking-pc">
                      {b.computerName || `PC #${b.computerId}`}
                      {b.bookedBy && b.bookedBy !== 'Клиент' && (
                        <span className="booking-user"> · {b.bookedBy}</span>
                      )}
                    </div>
                    <div className="booking-time">
                      {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                      <span className="booking-dur">· {formatDuration(b.startTime, b.endTime)}</span>
                    </div>
                  </div>
                  <div className="booking-actions">
                    <span className="badge status-booked">
                      {b.status === 'CONFIRMED' ? 'Подтверждена' : b.status}
                    </span>
                    <button className="btn-danger" onClick={() => handleCancel(b.id)}>Отменить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        Hotline Classic · ковёр, фигурки, янтарный свет
      </footer>
    </div>
  );
}
