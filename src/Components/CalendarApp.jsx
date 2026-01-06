import { useState, useEffect, useRef } from "react";

const CalendarApp = () => {
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
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [events, setEvents] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [eventStartTime, setEventStartTime] = useState({ hours: "00", minutes: "00" });
  const [eventEndTime, setEventEndTime] = useState({ hours: "01", minutes: "00" });
  const [activeTimeField, setActiveTimeField] = useState("start"); // 'start' or 'end'
  const [eventText, setEventText] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [timePickerMode, setTimePickerMode] = useState("hours"); // 'hours' or 'minutes'
  const [currentSystemTime, setCurrentSystemTime] = useState(new Date());

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
  const handleDayClick = (day) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    const today = new Date();
    if (clickedDate >= today || isSameDay(clickedDate, today)) {
      setSelectedDate(clickedDate);
      setEventStartTime({ hours: "00", minutes: "00" });
      setEventEndTime({ hours: "01", minutes: "00" });
      setEventText("");
      setEditingEvent(null);
      setActiveTimeField("start");
    }
  };

  const handleEventSubmit = () => {
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

    // Standard check: 00:00 to 01:00 is technically start=0, end=60. 
    // This is NOT overnight (60 > 0), so it bypasses the overnight check below and is treated as a normal morning event.

    // Check if end time is valid
    // If end > start: Normal case.
    // If end <= start: Overnight case.
    // To distinguish "Mistake" (e.g. 14:00 -> 13:00) from "Overnight" (23:00 -> 01:00),
    // we limit overnight duration to a "reasonable" shift length, e.g., 16 hours.

    if (endMinutes <= startMinutes) {
      const overnightDuration = (endMinutes + 1440) - startMinutes;
      if (overnightDuration > 600) { // 10 hours limit for overnight inference
        setAlertMessage("O horário final não pode ser anterior ao inicial.");
        setShowAlertDialog(true);
        return;
      }
    }

    // Allow overnight
    const isOvernight = endMinutes <= startMinutes;
    const effectiveEndMinutes = isOvernight ? endMinutes + 1440 : endMinutes;

    const hasOverlap = events.some(event => {
      if (editingEvent && event.id === editingEvent.id) return false;
      if (!isSameDay(event.date, selectedDate)) return false;

      const evStart = event.startTime || event.time;
      const evEnd = event.endTime || event.startTime || event.time;

      const evStartMinutes = parseInt(evStart.split(":")[0]) * 60 + parseInt(evStart.split(":")[1]);
      let evEndMinutes = parseInt(evEnd.split(":")[0]) * 60 + parseInt(evEnd.split(":")[1]);

      // If event end <= start, it spans to next day
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

    const newEvent = {
      id: editingEvent ? editingEvent.id : Date.now(),
      date: selectedDate,
      startTime: startStr,
      endTime: endStr,
      time: startStr, // Keep for backward compat if needed
      text: eventText,
    };

    let updatedEvents = [...events];
    if (editingEvent) {
      updatedEvents = updatedEvents.map((event) =>
        event.id === editingEvent.id ? newEvent : event
      );
    } else {
      updatedEvents.push(newEvent);
    }
    updatedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    setEvents(updatedEvents);
    setEventStartTime({ hours: "00", minutes: "00" });
    setEventEndTime({ hours: "01", minutes: "00" });
    setEventText("");
    setShowEventPopup(false);
    setEditingEvent(null);
    setActiveTimeField("start");
  };

  const handleEditEvent = (event) => {
    setSelectedDate(new Date(event.date));

    const startT = event.startTime || event.time;
    const endT = event.endTime || event.time; // Fallback for legacy

    setEventStartTime({
      hours: startT.split(":")[0],
      minutes: startT.split(":")[1],
    });

    // For end time, if legacy, maybe default to start + 1 or same? 
    // If same, validation might fail on save, but user can edit.
    setEventEndTime({
      hours: endT.split(":")[0],
      minutes: endT.split(":")[1],
    });

    setEventText(event.text);
    setEditingEvent(event);
    setShowEventPopup(true);
    setTimePickerMode("hours");
    setActiveTimeField("start");
  };

  const handleDeleteEvent = (eventId) => {
    const updatedEvents = events.filter((event) => event.id !== eventId);
    setEvents(updatedEvents);
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    setEventTime((prevTime) => ({
      ...prevTime,
      [name]: value.padStart(2, "0"),
    }));
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
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

  console.log(daysInMonth, firstDayOfMonth);
  console.log(currentMonth, currentYear, currentDate);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const app = document.querySelector('.calendar-app');
    if (app) {
      if (theme === 'light') {
        app.classList.add('light-theme');
      } else {
        app.classList.remove('light-theme');
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`calendar-app ${theme === 'light' ? 'light-theme' : ''}`}>
      <div className="calendar">
        <h1 className="heading">Agenda</h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          <i className={`bx ${theme === 'dark' ? 'bx-sun' : 'bx-moon'}`}></i>
        </button>
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
      <div className="events">
        <div className="events-header">

          <button className="add-event-btn" onClick={() => {
            setShowEventPopup(true);
            setTimePickerMode("hours");
          }}>
            <i className="bx bx-plus"></i> Agendar
          </button>
        </div>

        {events.filter((event) => isSameDay(event.date, selectedDate)).map((event, index) => (
          <div className="event" key={index}>
            <div className="event-date-wrapper">
              <div className="event-date">{`${event.date.getDate()} de ${monthOfYear[event.date.getMonth()]
                } de ${event.date.getFullYear()}`}</div>
              <div className="event-time">
                {event.startTime || event.time} - {event.endTime || (event.startTime ? parseInt(event.startTime.split(':')[0]) + 1 + ':' + event.startTime.split(':')[1] : '')}
              </div>
            </div>
            <div className="event-text">{event.text}</div>
            <div className="event-buttons">
              <i
                className="bx bxs-edit-alt"
                onClick={() => handleEditEvent(event)}
              ></i>
              <i
                className="bx bxs-message-alt-x"
                onClick={() => handleDeleteEvent(event.id)}
              ></i>
            </div>
          </div>
        ))}
      </div>
      {showEventPopup && (
        <div className="modal-overlay">
          <div className="event-popup">
            <div className="event-popup-header">
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
    </div>
  );
};

export default CalendarApp;
