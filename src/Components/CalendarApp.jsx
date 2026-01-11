import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from 'react-router-dom';



const CalendarApp = () => {
  const navigate = useNavigate();
  const dayOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthOfYear = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const currentDate = new Date();

  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [events, setEvents] = useState([]);

  const [eventStartTime, setEventStartTime] = useState({ hours: "00", minutes: "00" });
  const [eventEndTime, setEventEndTime] = useState({ hours: "01", minutes: "00" });
  const [activeTimeField, setActiveTimeField] = useState("start"); // 'start' or 'end'
  const [eventText, setEventText] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [timePickerMode, setTimePickerMode] = useState("hours"); // 'hours' or 'minutes'
  const [currentSystemTime, setCurrentSystemTime] = useState(new Date());

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServiceEvent, setSelectedServiceEvent] = useState(null);


  const currentEventTime = activeTimeField === 'start' ? eventStartTime : eventEndTime;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    setCurrentMonth((prevMonth) => (prevMonth === 0 ? 11 : prevMonth - 1));
    setCurrentYear((prevYear) =>
      currentMonth === 0 ? prevYear - 1 : prevYear
    );
  };
  const nextMonth = () => {
    setCurrentMonth((prevMonth) => (prevMonth === 11 ? 0 : prevMonth + 1));
    setCurrentYear((prevYear) =>
      currentMonth === 11 ? prevYear + 1 : prevYear
    );
  };
  // Fetch events from Supabase
  // Fetch events from Supabase
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*');

      if (error) throw error;

      if (data) {
        // Save to cache
        localStorage.setItem('cached_events', JSON.stringify(data));

        // Convert date strings back to Date objects for the UI
        const formattedEvents = data.map(event => ({
          ...event,
          date: new Date(event.date + 'T00:00:00') // Ensure local time doesn't shift day
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error.message);

      // Try initializing from cache if network fails
      const cached = localStorage.getItem('cached_events');
      if (cached) {
        const data = JSON.parse(cached);
        const formattedEvents = data.map(event => ({
          ...event,
          date: new Date(event.date + 'T00:00:00')
        }));
        setEvents(formattedEvents);
        setAlertMessage("Modo Offline: Exibindo dados salvos localmente.");
        setShowAlertDialog(true);
      }
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase.from('clients').select('id, name, fantasy_name, phone, street, number, neighborhood, city, code').order('name');
      if (data) setClients(data);
    } catch (error) {
      console.error('Error fetching clients', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchClients();
  }, []);

  const handleDayClick = (day) => {
    // Allow selecting any day, even past ones
    setSelectedDate(new Date(currentYear, currentMonth, day));
    setEventStartTime({ hours: "00", minutes: "00" });
    setEventEndTime({ hours: "01", minutes: "00" });
    setEventText("");
    setEditingEvent(null);
    setSelectedClient("");
    setActiveTimeField("start");
  };

  // Sync Queue Logic
  const processSyncQueue = async () => {
    if (!navigator.onLine) return;

    const queueStr = localStorage.getItem('sync_queue');
    if (!queueStr) return;

    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;

    console.log("Processing sync queue:", queue);

    try {
      for (const item of queue) {
        if (item.type === 'INSERT') {
          // Remove temporary ID and isLocal flag before sending
          const { id, isLocal, ...eventData } = item.payload;
          await supabase.from('events').insert([eventData]);
        } else if (item.type === 'UPDATE') {
          const { id, isLocal, ...eventData } = item.payload;
          await supabase.from('events').update(eventData).eq('id', id);
        } else if (item.type === 'DELETE') {
          await supabase.from('events').delete().eq('id', item.id);
        }
      }

      // Clear queue after success
      localStorage.removeItem('sync_queue');
      // Refresh real data
      await fetchEvents();

    } catch (err) {
      console.error("Sync error", err);
      // Keep queue to retry later
    }
  };

  useEffect(() => {
    window.addEventListener('online', processSyncQueue);
    // Try to process on mount if online
    processSyncQueue();
    return () => window.removeEventListener('online', processSyncQueue);
  }, []);

  const addToQueue = (action) => {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');

    // Optimization: If we update an event that is currently pending insert, just update the insert payload
    if (action.type === 'UPDATE') {
      const pendingInsertIndex = queue.findIndex(q => q.type === 'INSERT' && q.payload.id === action.payload.id);
      if (pendingInsertIndex >= 0) {
        queue[pendingInsertIndex].payload = { ...queue[pendingInsertIndex].payload, ...action.payload };
        localStorage.setItem('sync_queue', JSON.stringify(queue));
        return;
      }
    }
    // Optimization: If we delete an event pending insert, just remove the insert
    if (action.type === 'DELETE') {
      const pendingInsertIndex = queue.findIndex(q => q.type === 'INSERT' && q.payload.id === action.id);
      if (pendingInsertIndex >= 0) {
        queue.splice(pendingInsertIndex, 1);
        localStorage.setItem('sync_queue', JSON.stringify(queue));
        return;
      }
    }

    queue.push(action);
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  };

  const handleEventSubmit = async () => {
    const startStr = `${eventStartTime.hours.padStart(2, "0")}:${eventStartTime.minutes.padStart(2, "0")}`;
    const endStr = `${eventEndTime.hours.padStart(2, "0")}:${eventEndTime.minutes.padStart(2, "0")}`;

    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(parseInt(eventStartTime.hours), parseInt(eventStartTime.minutes), 0, 0);

    const currentDateTime = new Date();
    if (appointmentDate < new Date(currentDateTime.setSeconds(0, 0))) {
      setAlertMessage("Não é possível criar agendamentos no passado.");
      setShowAlertDialog(true);
      return;
    }

    const startMinutes = parseInt(eventStartTime.hours) * 60 + parseInt(eventStartTime.minutes);
    const endMinutes = parseInt(eventEndTime.hours) * 60 + parseInt(eventEndTime.minutes);

    if (endMinutes <= startMinutes) {
      const overnightDuration = (endMinutes + 1440) - startMinutes;
      if (overnightDuration > 600) {
        setAlertMessage("O horário final não pode ser anterior ao inicial.");
        setShowAlertDialog(true);
        return;
      }
    }

    const isOvernight = endMinutes <= startMinutes;
    const effectiveEndMinutes = isOvernight ? endMinutes + 1440 : endMinutes;

    const hasOverlap = events.some(event => {
      if (editingEvent && event.id === editingEvent.id) return false;
      if (!isSameDay(event.date, selectedDate)) return false;

      const evStart = event.start_time || event.startTime || event.time;
      const evEnd = event.end_time || event.endTime || evStart;

      const evStartMinutes = parseInt(evStart.split(":")[0]) * 60 + parseInt(evStart.split(":")[1]);
      let evEndMinutes = parseInt(evEnd.split(":")[0]) * 60 + parseInt(evEnd.split(":")[1]);

      if (evEndMinutes <= evStartMinutes) {
        evEndMinutes += 1440;
      }
      const effectiveEvEnd = evEndMinutes === evStartMinutes ? evStartMinutes + 60 : evEndMinutes;

      return startMinutes < effectiveEvEnd && effectiveEndMinutes > evStartMinutes;
    });

    if (hasOverlap) {
      setAlertMessage("Já existe um agendamento nesse horário.");
      setShowAlertDialog(true);
      return;
    }

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const eventData = {
      date: dateStr,
      start_time: startStr,
      end_time: endStr,
      text: eventText,
      client_id: selectedClient || null
    };

    // Optimistic Update Logic
    const eventStateData = { ...eventData, date: new Date(dateStr + 'T00:00:00') };
    const normalizeForCache = (list) => list.map(ev => ({
      ...ev,
      date: ev.date instanceof Date
        ? `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, '0')}-${String(ev.date.getDate()).padStart(2, '0')}`
        : ev.date
    }));

    if (editingEvent) {
      const updatedEvent = { ...editingEvent, ...eventStateData };
      // Update UI immediately
      const updatedList = events.map(ev => ev.id === editingEvent.id ? updatedEvent : ev);
      setEvents(updatedList);

      // Update persistent Cache for offline reloads (Normalize to YYYY-MM-DD)
      localStorage.setItem('cached_events', JSON.stringify(normalizeForCache(updatedList)));

      if (!navigator.onLine) {
        addToQueue({ type: 'UPDATE', payload: { ...eventData, id: editingEvent.id } });
      } else {
        // Online: Try sending
        try {
          const { error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id);
          if (error) throw error;
        } catch (err) {
          console.error("Online save failed, queuing", err);
          addToQueue({ type: 'UPDATE', payload: { ...eventData, id: editingEvent.id } });
        }
      }

    } else {
      // Create new
      const tempId = Date.now(); // Temp ID for local use
      const newEvent = { ...eventStateData, id: tempId, isLocal: true };

      // Update UI
      const updatedList = [...events, newEvent].sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(updatedList);

      // Update Cache
      localStorage.setItem('cached_events', JSON.stringify(normalizeForCache(updatedList)));

      if (!navigator.onLine) {
        addToQueue({ type: 'INSERT', payload: { ...eventData, id: tempId, isLocal: true } });
      } else {
        try {
          const { error } = await supabase.from('events').insert([eventData]);
          if (error) throw error;
          // If successful, fetchEvents will eventually replace the temp ID item with real one
          await fetchEvents();
        } catch (err) {
          addToQueue({ type: 'INSERT', payload: { ...eventData, id: tempId, isLocal: true } });
        }
      }
    }

    setEventStartTime({ hours: "00", minutes: "00" });
    setEventEndTime({ hours: "01", minutes: "00" });
    setEventText("");
    setShowEventPopup(false);
    setEditingEvent(null);
    setSelectedClient("");
    setActiveTimeField("start");
  };

  const handleCardClick = (event) => {
    setSelectedServiceEvent(event);
    setShowServiceModal(true);
  };

  const handleStartOS = () => {
    // Navigate to Activities page, passing the selected event/client context if needed
    // Assuming Activities page can handle location state or params
    // For now, just navigating as requested.
    // Enhanced: Pass the client ID and event ID to pre-select or load context
    const client = selectedServiceEvent.client_id ? clients.find(c => c.id === selectedServiceEvent.client_id) : null;

    navigate('/activities', {
      state: {
        eventId: selectedServiceEvent.id,
        clientId: selectedServiceEvent.client_id,
        clientName: client ? (client.fantasy_name || client.name) : '',
        description: selectedServiceEvent.text
      }
    });

    setShowServiceModal(false);
  };

  const handleNonAttendance = () => {
    // Logic to register non-attendance
    console.log("Registrar Não Atendimento for event:", selectedServiceEvent);
    alert("Funcionalidade 'Registrar Não Atendimento' será implementada em breve.");
    setShowServiceModal(false);
  };

  const handleEditEvent = (event) => {
    setSelectedDate(new Date(event.date));

    // Handle both snake_case (DB) and camelCase (legacy/local)
    const startT = event.start_time || event.startTime || event.time;
    const endT = event.end_time || event.endTime || event.time;

    setEventStartTime({
      hours: startT.split(":")[0],
      minutes: startT.split(":")[1],
    });

    setEventEndTime({
      hours: endT.split(":")[0],
      minutes: endT.split(":")[1],
    });

    setEventText(event.text);
    setSelectedClient(event.client_id || "");
    setEditingEvent(event);
    setShowEventPopup(true);
    setTimePickerMode("hours");
    setActiveTimeField("start");
  };

  const handleDeleteEvent = async (eventId) => {
    // Optimistic Delete
    const updatedEvents = events.filter((event) => event.id !== eventId);
    setEvents(updatedEvents);

    // Normalize and Save Cache
    const normalizeForCache = (list) => list.map(ev => ({
      ...ev,
      date: ev.date instanceof Date
        ? `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, '0')}-${String(ev.date.getDate()).padStart(2, '0')}`
        : ev.date
    }));
    localStorage.setItem('cached_events', JSON.stringify(normalizeForCache(updatedEvents)));

    if (!navigator.onLine) {
      addToQueue({ type: 'DELETE', id: eventId });
    } else {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);

        if (error) throw error;
        // Don't need to fetchEvents immediately since we already removed it from UI
      } catch (error) {
        console.error("Error deleting event:", error);
        // Queue if fails
        addToQueue({ type: 'DELETE', id: eventId });
      }
    }
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    setEventTime((prevTime) => ({
      ...prevTime,
      [name]: value.padStart(2, "0"),
    }));
  };

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const clockRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateTimeFromAngle = (clientX, clientY, mode) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    // Angle in degrees, 0 at 12 o'clock
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (mode === "hours") {
      const hourIndex = Math.round(angle / 30) % 12;
      const isInner = dist < 82;

      let hour;
      if (isInner) {
        if (hourIndex === 0) hour = 0;
        else hour = hourIndex + 12;
      } else {
        if (hourIndex === 0) hour = 12;
        else hour = hourIndex;
      }

      const val = hour.toString().padStart(2, "0");
      if (activeTimeField === 'start') {
        setEventStartTime(prev => {
          const newStart = { ...prev, hours: val };
          // Auto update end time to start + 1h
          const nextHour = (parseInt(val) + 1) % 24;
          setEventEndTime({
            hours: nextHour.toString().padStart(2, "0"),
            minutes: newStart.minutes
          });
          return newStart;
        });
      } else {
        setEventEndTime(prev => ({ ...prev, hours: val }));
      }
    } else {
      // Minutes
      const minute = Math.round(angle / 6) % 60;
      const val = minute.toString().padStart(2, "0");

      if (activeTimeField === 'start') {
        setEventStartTime(prev => {
          const newStart = { ...prev, minutes: val };
          // Auto update end time to match minutes, keeping 1h diff
          const endHour = (parseInt(newStart.hours) + 1) % 24;
          setEventEndTime({
            hours: endHour.toString().padStart(2, "0"),
            minutes: val
          });
          return newStart;
        });
      } else {
        setEventEndTime(prev => ({ ...prev, minutes: val }));
      }
    }
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    // e.preventDefault() prevents text selection and browser default touch actions (scrolling)
    // Note: 'touch-action: none' in CSS handles the scrolling part mostly, but preventDefault is good for mouse selection.
    if (e.cancelable) e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    calculateTimeFromAngle(clientX, clientY, timePickerMode);
  };

  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      calculateTimeFromAngle(clientX, clientY, timePickerMode);
    };

    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (timePickerMode === "hours") {
          setTimePickerMode("minutes");
        }
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMove);
      window.addEventListener("mouseup", handleGlobalUp);
      window.addEventListener("touchmove", handleGlobalMove, { passive: false });
      window.addEventListener("touchend", handleGlobalUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [isDragging, timePickerMode]);





  return (
    <div className="calendar-app">
      {/* Header managed by Layout */}
      <div className="calendar-content">
        {showCalendar && (
          <div className="calendar">
            {/* Removed Heading and Header Controls */}

            <div className="navigate-date">
              <h2 className="month">
                {monthOfYear[currentMonth]} {currentYear}
              </h2>
              <div className="buttons">
                <i className="bx bx-chevron-left" onClick={prevMonth}></i>
                <i className="bx bx-chevron-right" onClick={nextMonth}></i>
              </div>
            </div>
            <div className="weekdays">
              {dayOfWeek.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="days">
              {[...Array(firstDayOfMonth).keys()].map((_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {[...Array(daysInMonth).keys()].map((day) => {
                const dateToCheck = new Date(currentYear, currentMonth, day + 1);
                const eventCount = events.filter((event) =>
                  isSameDay(event.date, dateToCheck)
                ).length;

                return (
                  <span
                    key={day + 1}
                    className={
                      `${isSameDay(dateToCheck, currentDate) ? "current-day " : ""
                      }${isSameDay(dateToCheck, selectedDate) ? "selected-day" : ""
                      }`
                    }
                    onClick={() => handleDayClick(day + 1)}
                  >
                    {day + 1}
                    {eventCount > 0 && (
                      <div className="event-count">{eventCount}</div>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="events">
          <div className="events-header" style={{ justifyContent: 'space-between', paddingLeft: '1rem' }}>
            <button className="toggle-calendar-btn" onClick={() => setShowCalendar(!showCalendar)} style={{
              background: 'transparent',
              border: '1px solid var(--text-muted)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1rem'
            }}>
              <i className={`bx ${showCalendar ? 'bx-chevron-up' : 'bx-calendar'}`}></i>
              {showCalendar ? 'Ocultar' : 'Ver Calendário'}
            </button>

            <button className="add-event-btn" onClick={() => {
              setShowEventPopup(true);
              setTimePickerMode("hours");
            }}>
              <i className="bx bx-plus"></i> Agendar
            </button>
          </div>

          <div className="events-list">
            {events
              .filter((event) => isSameDay(event.date, selectedDate))
              .sort((a, b) => {
                const timeA = a.start_time || a.startTime || a.time;
                const timeB = b.start_time || b.startTime || b.time;
                const minA = parseInt(timeA.split(':')[0]) * 60 + parseInt(timeA.split(':')[1]);
                const minB = parseInt(timeB.split(':')[0]) * 60 + parseInt(timeB.split(':')[1]);
                return minA - minB;
              })
              .map((event, index) => {
                const client = event.client_id ? clients.find(c => c.id === event.client_id) : null;
                return (
                  <div className="event" key={index} onClick={() => handleCardClick(event)} style={{ cursor: 'pointer' }}>
                    <div className="event-date-wrapper" style={{ minWidth: '130px' }}>
                      {client && client.code && (
                        <div style={{
                          backgroundColor: 'var(--accent-color)',
                          color: '#fff',
                          fontSize: '0.8rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          marginBottom: '4px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {client.code}
                        </div>
                      )}
                      <div className="event-date">{`${event.date.getDate()} de ${monthOfYear[event.date.getMonth()]
                        } de ${event.date.getFullYear()}`}</div>
                      <div className="event-time" style={{ whiteSpace: 'nowrap', fontSize: '1.4rem' }}>
                        {event.start_time || event.startTime || event.time} - {event.end_time || event.endTime || (event.startTime ? parseInt(event.startTime.split(':')[0]) + 1 + ':' + event.startTime.split(':')[1] : '')}
                      </div>
                    </div>

                    <div className="event-details" style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="event-text" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{event.text}</div>

                      {client && (
                        <div className="client-info" style={{ display: 'flex', flexDirection: 'column', fontSize: '1.3rem', color: 'var(--text-secondary)' }}>
                          <div style={{ color: 'var(--accent-color)', fontWeight: '700', fontSize: '1.5rem', marginBottom: '4px' }}>
                            <i className='bx bxs-user-detail' style={{ marginRight: '8px' }}></i>
                            {client.fantasy_name || client.name}
                          </div>
                          {client.phone && (
                            <div style={{ marginBottom: '2px' }}>
                              <i className='bx bxs-phone' style={{ marginRight: '8px' }}></i>
                              {client.phone}
                            </div>
                          )}
                          {(client.street || client.city) && (
                            <div style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: '1.4' }}>
                              <i className='bx bxs-map' style={{ marginRight: '8px' }}></i>
                              {client.street}{client.number ? `, ${client.number}` : ''}
                              {client.neighborhood ? ` - ${client.neighborhood}` : ''}
                              {client.city ? ` - ${client.city}` : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="event-buttons">
                      <i
                        className="bx bxs-edit-alt"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      ></i>
                      <i
                        className="bx bxs-message-alt-x"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                      ></i>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {showEventPopup && (
        <div className="modal-overlay">
          <div className="event-popup">
            <div className="event-popup-header">
              <div className="popup-client-wrapper">
                <label className="popup-client-label">Cliente</label>
                <select
                  className="popup-client-select"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.fantasy_name || client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="header-date">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).charAt(0).toUpperCase() + selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).slice(1)}, {selectedDate.getDate()} de {monthOfYear[selectedDate.getMonth()]} de {selectedDate.getFullYear()}
              </div>
              <div className="header-time-section">
                <div
                  className={`time-selector ${activeTimeField === 'start' ? 'active' : ''}`}
                  onClick={() => setActiveTimeField('start')}
                >
                  <label>Início</label>
                  <div className="time-display">
                    <span
                      className={activeTimeField === 'start' && timePickerMode === "hours" ? "active-time" : ""}
                      onClick={(e) => { e.stopPropagation(); setActiveTimeField('start'); setTimePickerMode("hours"); }}
                    >
                      {eventStartTime.hours}
                    </span>
                    :
                    <span
                      className={activeTimeField === 'start' && timePickerMode === "minutes" ? "active-time" : ""}
                      onClick={(e) => { e.stopPropagation(); setActiveTimeField('start'); setTimePickerMode("minutes"); }}
                    >
                      {eventStartTime.minutes}
                    </span>
                  </div>
                </div>
                <div
                  className={`time-selector ${activeTimeField === 'end' ? 'active' : ''}`}
                  onClick={() => setActiveTimeField('end')}
                >
                  <label>Fim</label>
                  <div className="time-display">
                    <span
                      className={activeTimeField === 'end' && timePickerMode === "hours" ? "active-time" : ""}
                      onClick={(e) => { e.stopPropagation(); setActiveTimeField('end'); setTimePickerMode("hours"); }}
                    >
                      {eventEndTime.hours}
                    </span>
                    :
                    <span
                      className={activeTimeField === 'end' && timePickerMode === "minutes" ? "active-time" : ""}
                      onClick={(e) => { e.stopPropagation(); setActiveTimeField('end'); setTimePickerMode("minutes"); }}
                    >
                      {eventEndTime.minutes}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="clock-container">
              <div
                className="clock-face"
                ref={clockRef}
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
              >
                <div className="center-point"></div>
                {/* Clock Hand */}
                {/* Clock Hand */}
                <div
                  className="clock-hand"
                  style={{
                    transform: `rotate(${timePickerMode === "hours"
                      ? (parseInt(currentEventTime.hours) % 12) * 30
                      : parseInt(currentEventTime.minutes) * 6
                      }deg)`,
                    height:
                      timePickerMode === "minutes"
                        ? "98px" // Matches outer ring radius approx
                        : (
                          (parseInt(currentEventTime.hours) > 12 || parseInt(currentEventTime.hours) === 0)
                            ? "66px" // Inner radius
                            : "98px" // Outer radius
                        ),
                  }}
                ></div>

                {/* Hours Numbers */}
                {timePickerMode === "hours" && (
                  <>
                    {[...Array(12).keys()].map((i) => {
                      const hour = i + 1;
                      const angle = hour * 30;
                      return (
                        <div
                          key={`h-${hour}`}
                          className={`clock-number outer ${parseInt(currentEventTime.hours) === hour
                            ? "selected"
                            : ""
                            }`}
                          style={{
                            transform: `rotate(${angle}deg) translate(0, -98px) rotate(-${angle}deg)`,
                          }}
                        >
                          {hour}
                        </div>
                      );
                    })}
                    {[...Array(12).keys()].map((i) => {
                      const actualHour = i === 0 ? 0 : i + 12; // 0 -> 00, 1 -> 13
                      const rot = i * 30;

                      return (
                        <div
                          key={`h-in-${actualHour}`}
                          className={`clock-number inner ${parseInt(currentEventTime.hours) === actualHour ? "selected" : ""
                            }`}
                          style={{
                            transform: `rotate(${rot}deg) translate(0, -66px) rotate(-${rot}deg)`,
                          }}
                        >
                          {actualHour === 0 ? "00" : actualHour}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Minutes Numbers */}
                {timePickerMode === "minutes" &&
                  [...Array(12).keys()].map((i) => {
                    const minute = i * 5;
                    const angle = i * 30;
                    return (
                      <div
                        key={`m-${minute}`}
                        className={`clock-number outer ${Math.abs(parseInt(currentEventTime.minutes) - minute) < 5 ? "selected" : ""
                          }`}
                        style={{
                          transform: `rotate(${angle}deg) translate(0, -98px) rotate(-${angle}deg)`,
                        }}
                      >
                        {minute.toString().padStart(2, "0")}
                      </div>
                    );
                  })}
              </div>
            </div>

            <textarea
              className="popup-text-input"
              placeholder="Digite o texto do evento (Máximo 60 caracteres)"
              value={eventText}
              onChange={(e) => {
                if (e.target.value.length <= 60) {
                  setEventText(e.target.value);
                }
              }}
            ></textarea>

            <div className="event-popup-buttons">
              <button className="cancel-btn" onClick={() => setShowEventPopup(false)}>Cancelar</button>
              <button className="ok-btn" onClick={handleEventSubmit}>OK</button>
            </div>

          </div>
        </div>
      )}
      {showAlertDialog && (
        <div className="modal-overlay">
          <div className="alert-popup">
            <div className="alert-icon">
              <i className='bx bx-error-circle'></i>
            </div>
            <div className="alert-message">{alertMessage}</div>
            <button className="alert-ok-btn" onClick={() => setShowAlertDialog(false)}>OK</button>
          </div>
        </div>
      )}

      {
        showServiceModal && selectedServiceEvent && (() => {
          const client = selectedServiceEvent.client_id ? clients.find(c => c.id === selectedServiceEvent.client_id) : null;
          return (
            <div className="modal-overlay">
              <div className="event-popup" style={{ maxWidth: '90%', width: '400px', height: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Detalhes do Agendamento</h3>
                  <i className='bx bx-x' style={{ fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowServiceModal(false)}></i>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className='bx bx-calendar' style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}></i>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {`${selectedServiceEvent.date.getDate()} de ${monthOfYear[selectedServiceEvent.date.getMonth()]} de ${selectedServiceEvent.date.getFullYear()}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className='bx bx-time' style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}></i>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {selectedServiceEvent.start_time || selectedServiceEvent.startTime || selectedServiceEvent.time} - {selectedServiceEvent.end_time || selectedServiceEvent.endTime}
                    </span>
                  </div>
                  {selectedServiceEvent.text && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className='bx bx-notepad' style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}></i>
                      <span style={{ fontSize: '1.1rem' }}>{selectedServiceEvent.text}</span>
                    </div>
                  )}
                </div>

                {client && (
                  <div style={{ padding: '15px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-color)' }}>{client.fantasy_name || client.name}</span>
                      {client.code && <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--accent-color)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{client.code}</span>}
                    </div>
                    {client.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <i className='bx bxs-phone'></i>
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {(client.street || client.city) && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)' }}>
                        <i className='bx bxs-map' style={{ marginTop: '3px' }}></i>
                        <span style={{ fontSize: '0.9rem' }}>
                          {client.street}{client.number ? `, ${client.number}` : ''}
                          {client.neighborhood ? ` - ${client.neighborhood}` : ''}
                          {client.city ? ` - ${client.city}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={handleStartOS}
                    style={{
                      padding: '12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className='bx bx-play-circle'></i> Iniciar OS
                  </button>
                  <button
                    onClick={handleNonAttendance}
                    style={{
                      padding: '12px',
                      backgroundColor: '#FF5722',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className='bx bx-x-circle'></i> Registrar Não Atendimento
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      }
    </div >
  );
};

export default CalendarApp;
