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
  const [events, setEvents] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [eventTime, setEventTime] = useState({ hours: "00", minutes: "00" });
  const [eventText, setEventText] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [timePickerMode, setTimePickerMode] = useState("hours"); // 'hours' or 'minutes'

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
      setEventTime({ hours: "00", minutes: "00" });
      setEventText("");
      setEditingEvent(null);
    }
  };

  const handleEventSubmit = () => {
    const newEvent = {
      id: editingEvent ? editingEvent.id : Date.now(),
      date: selectedDate,
      time: `${eventTime.hours.padStart(2, "0")}:${eventTime.minutes.padStart(
        2,
        "0"
      )}`,
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
    setEventTime({ hours: "00", minutes: "00" });
    setEventText("");
    setShowEventPopup(false);
    setEditingEvent(null);
  };

  const handleEditEvent = (event) => {
    setSelectedDate(new Date(event.date));
    setEventTime({
      hours: event.time.split(":")[0],
      minutes: event.time.split(":")[1],
    });
    setEventText(event.text);
    setEditingEvent(event);
    setEditingEvent(event);
    setShowEventPopup(true);
    setTimePickerMode("hours");
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
      const isInner = dist < 82; // Threshold between inner (66px) and outer (98px)

      let hour;
      if (isInner) {
        if (hourIndex === 0) hour = 0; // Top position inner is 00
        else hour = hourIndex + 12; // e.g. 1 -> 13
      } else {
        if (hourIndex === 0) hour = 12; // Top position outer is 12
        else hour = hourIndex;
      }
      setEventTime(prev => ({ ...prev, hours: hour.toString().padStart(2, "0") }));
    } else {
      // Minutes - snap to minute (6 degrees)
      const minute = Math.round(angle / 6) % 60;
      setEventTime(prev => ({ ...prev, minutes: minute.toString().padStart(2, "0") }));
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
          <h2 className="month">{monthOfYear[currentMonth]},</h2>
          <h2 className="year">{currentYear}</h2>
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
          <h3 className="event-list-title">
            {selectedDate.getDate()} de {monthOfYear[selectedDate.getMonth()]}
          </h3>
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
              <div className="event-time">{event.time}</div>
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
              <div className="header-year">{selectedDate.getFullYear()}</div>
              <div className="header-date">
                {`${dayOfWeek[selectedDate.getDay()]}, ${selectedDate.getDate()} ${monthOfYear[selectedDate.getMonth()].slice(0, 3)
                  }`}
              </div>
              <div className="header-time">
                <span
                  className={timePickerMode === "hours" ? "active-time" : ""}
                  onClick={() => setTimePickerMode("hours")}
                >
                  {eventTime.hours}
                </span>
                :
                <span
                  className={timePickerMode === "minutes" ? "active-time" : ""}
                  onClick={() => setTimePickerMode("minutes")}
                >
                  {eventTime.minutes}
                </span>
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
                      ? (parseInt(eventTime.hours) % 12) * 30
                      : parseInt(eventTime.minutes) * 6
                      }deg)`,
                    height:
                      timePickerMode === "minutes"
                        ? "98px" // Matches outer ring radius approx
                        : (
                          (parseInt(eventTime.hours) > 12 || parseInt(eventTime.hours) === 0)
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
                          className={`clock-number outer ${parseInt(eventTime.hours) === hour
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
                          className={`clock-number inner ${parseInt(eventTime.hours) === actualHour ? "selected" : ""
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
                        className={`clock-number outer ${Math.abs(parseInt(eventTime.minutes) - minute) < 5 ? "selected" : ""
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
    </div>
  );
};

export default CalendarApp;
