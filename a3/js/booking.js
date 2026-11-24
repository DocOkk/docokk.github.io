/* Vcare Opticals - booking form validation.
   - Checks every required field and the format of names, email and phone.
   - Checks the date is not in the past, not a Sunday and within 3 months,
     and that Saturday times fall before the 2 pm close.
   - Shows an error next to each field and a linked summary at the top.
   - The form cannot be submitted until every error is fixed. */
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("booking-form");
  if (!form) {
    return;
  }

  const summary = document.getElementById("error-summary");
  const summaryList = summary.querySelector("ul");
  const confirmation = document.getElementById("confirmation");
  const contactNameField = document.getElementById("contact-name-field");
  const notes = document.getElementById("notes");
  const notesCount = document.getElementById("notes-count");

  const NAME_PATTERN = /^[A-Za-zÀ-ſ][A-Za-zÀ-ſ' -]*[A-Za-zÀ-ſ]$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // Australian landline (02/03/07/08), mobile (04) or +61 format
  const PHONE_PATTERN = /^(?:0[23478]\d{8}|\+61[23478]\d{8})$/;
  const LAST_SATURDAY_SLOT = "13:30";
  const DAY_MS = 24 * 60 * 60 * 1000;

  let submitted = false; // only show live errors after the first submit attempt

  // Use our own messages instead of the browser's built-in bubbles
  form.noValidate = true;

  /* ---------- date helpers ---------- */
  function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function toInputValue(date) {
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + m + "-" + d;
  }

  // Parse "yyyy-mm-dd" as a local date (new Date("yyyy-mm-dd") would use UTC)
  function parseDate(value) {
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return null;
    }
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(date.getTime()) ? null : date;
  }

  function ageOn(dob, onDate) {
    let age = onDate.getFullYear() - dob.getFullYear();
    const birthdayPassed = onDate.getMonth() > dob.getMonth() ||
      (onDate.getMonth() === dob.getMonth() && onDate.getDate() >= dob.getDate());
    if (!birthdayPassed) {
      age -= 1;
    }
    return age;
  }

  // Help the date pickers: no past appointment dates, no future birth dates
  const maxBooking = new Date(today().getTime() + 92 * DAY_MS);
  form["appt-date"].min = toInputValue(today());
  form["appt-date"].max = toInputValue(maxBooking);
  form.dob.max = toInputValue(today());

  /* ---------- pre-select the appointment type from links like booking.html?type=annual ---------- */
  const typeFromUrl = new URLSearchParams(window.location.search).get("type");
  if (typeFromUrl && form["appt-type"].querySelector('option[value="' + CSS.escape(typeFromUrl) + '"]')) {
    form["appt-type"].value = typeFromUrl;
  }

  /* ---------- show "your name" only when booking for someone else ---------- */
  function updateContactName() {
    const bookingFor = form["booking-for"].value;
    const needsName = bookingFor === "child" || bookingFor === "other";
    contactNameField.hidden = !needsName;
    form["contact-name"].required = needsName;
    if (!needsName) {
      setError("contact-name", "");
    }
  }

  /* ---------- character counter for the notes box ---------- */
  function updateCount() {
    const left = notes.maxLength - notes.value.length;
    notesCount.textContent = left + (left === 1 ? " character left" : " characters left");
  }

  /* ---------- validation rules: each returns an error message, or "" if valid ---------- */
  function checkName(value, what) {
    const v = value.trim();
    if (v === "") {
      return "Enter " + what + ".";
    }
    if (v.length < 2 || !NAME_PATTERN.test(v)) {
      return "Enter " + what + " using letters only (hyphens, apostrophes and spaces are fine).";
    }
    return "";
  }

  const rules = {
    "appt-type": function () {
      return form["appt-type"].value === "" ? "Choose an appointment type." : "";
    },
    "appt-date": function () {
      const value = form["appt-date"].value;
      if (value === "") {
        return "Choose a preferred date.";
      }
      const date = parseDate(value);
      if (!date) {
        return "Enter a real date, for example 15/03/2027.";
      }
      if (date < today()) {
        return "Choose a date from today onwards.";
      }
      if (date > maxBooking) {
        return "Choose a date within the next 3 months.";
      }
      if (date.getDay() === 0) {
        return "We're closed on Sundays. Choose Monday to Saturday.";
      }
      return "";
    },
    "appt-time": function () {
      const time = form["appt-time"].value;
      if (time === "") {
        return "Choose a preferred time.";
      }
      const date = parseDate(form["appt-date"].value);
      if (date && date.getDay() === 6 && time > LAST_SATURDAY_SLOT) {
        return "On Saturdays we close at 2 pm. Choose 1:30 pm or earlier.";
      }
      if (date && date.getTime() === today().getTime()) {
        const now = new Date();
        const nowHm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
        if (time <= nowHm) {
          return "That time has already passed today. Choose a later time or another day.";
        }
      }
      return "";
    },
    "booking-for": function () {
      return form["booking-for"].value === "" ? "Choose who the appointment is for." : "";
    },
    "patient-first": function () {
      return checkName(form["patient-first"].value, "the patient's first name");
    },
    "patient-last": function () {
      return checkName(form["patient-last"].value, "the patient's last name");
    },
    "dob": function () {
      const value = form.dob.value;
      if (value === "") {
        return "Enter the patient's date of birth.";
      }
      const dob = parseDate(value);
      if (!dob) {
        return "Enter a real date of birth, for example 21/06/1980.";
      }
      if (dob > today()) {
        return "Date of birth can't be in the future.";
      }
      const age = ageOn(dob, today());
      if (age > 120) {
        return "Check the year of birth.";
      }
      if (form["booking-for"].value === "child" && age >= 18) {
        return "You chose 'My child', but this date of birth is for someone 18 or older.";
      }
      if (form["appt-type"].value === "children" && age >= 18) {
        return "Children's eye examinations are for patients under 18. Choose a different appointment type.";
      }
      if (form["booking-for"].value === "self" && age < 16) {
        return "Patients under 16 need a parent or guardian to book. Choose 'My child'.";
      }
      return "";
    },
    "visited": function () {
      return form.visited.value === "" ? "Tell us whether the patient has visited before." : "";
    },
    "contact-name": function () {
      if (!form["contact-name"].required) {
        return "";
      }
      return checkName(form["contact-name"].value, "your full name");
    },
    "email": function () {
      const v = form.email.value.trim();
      if (v === "") {
        return "Enter your email address.";
      }
      if (!EMAIL_PATTERN.test(v)) {
        return "Enter an email address in the format name@example.com.";
      }
      return "";
    },
    "phone": function () {
      const raw = form.phone.value.trim();
      if (raw === "") {
        return "Enter your phone number.";
      }
      const digits = raw.replace(/[\s()-]/g, "");
      if (!PHONE_PATTERN.test(digits)) {
        return "Enter a 10-digit Australian number, for example 0412 345 678 or 07 5111 4488.";
      }
      return "";
    },
    "contact-pref": function () {
      return form["contact-pref"].value === "" ? "Choose how we should confirm your booking." : "";
    },
    "consent": function () {
      return form.consent.checked ? "" : "Tick the box so we can contact you to confirm.";
    }
  };

  // The element to focus and highlight for each rule
  function targetFor(name) {
    const field = form.elements[name];
    if (field instanceof RadioNodeList) {
      return field[0];
    }
    return field;
  }

  function setError(name, message) {
    const errorEl = document.getElementById(name + "-error");
    const field = form.elements[name];
    const inputs = field instanceof RadioNodeList ? Array.from(field) : [field];
    if (errorEl) {
      errorEl.textContent = message;
    }
    inputs.forEach(function (input) {
      input.setAttribute("aria-invalid", message ? "true" : "false");
      if (input.type !== "radio" && input.type !== "checkbox") {
        input.classList.toggle("invalid", Boolean(message));
      }
    });
  }

  function validateField(name) {
    const message = rules[name]();
    setError(name, message);
    return message;
  }

  function validateAll() {
    const errors = [];
    Object.keys(rules).forEach(function (name) {
      const message = validateField(name);
      if (message) {
        errors.push({ name: name, message: message });
      }
    });
    return errors;
  }

  function showSummary(errors) {
    summaryList.textContent = "";
    errors.forEach(function (error) {
      const li = document.createElement("li");
      const link = document.createElement("a");
      const target = targetFor(error.name);
      link.href = "#" + target.id;
      link.textContent = error.message;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        target.focus();
      });
      li.appendChild(link);
      summaryList.appendChild(li);
    });
    summary.hidden = errors.length === 0;
  }

  /* ---------- confirmation ---------- */
  function selectedText(select) {
    return select.options[select.selectedIndex].text;
  }

  function radioText(name) {
    const checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.parentElement.textContent.trim() : "";
  }

  function showConfirmation() {
    const list = document.getElementById("confirm-list");
    const date = parseDate(form["appt-date"].value);
    const rows = [
      ["Appointment", selectedText(form["appt-type"])],
      ["Practitioner", selectedText(form.practitioner)],
      ["Requested time", date.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
        " at " + selectedText(form["appt-time"])],
      ["Patient", form["patient-first"].value.trim() + " " + form["patient-last"].value.trim()],
      ["Confirm by", radioText("contact-pref")]
    ];
    list.textContent = "";
    rows.forEach(function (row) {
      const wrapper = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.textContent = row[1]; // textContent, never innerHTML, so user input can't inject markup
      wrapper.appendChild(dt);
      wrapper.appendChild(dd);
      list.appendChild(wrapper);
    });
    form.hidden = true;
    summary.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
  }

  /* ---------- events ---------- */
  form.addEventListener("submit", function (event) {
    event.preventDefault(); // the site has no server, so we never send the data anywhere
    submitted = true;
    const errors = validateAll();
    showSummary(errors);
    if (errors.length > 0) {
      summary.focus();
      return;
    }
    showConfirmation();
  });

  // Show or hide the "your name" field straight away
  form.addEventListener("change", function (event) {
    if (event.target.name === "booking-for") {
      updateContactName();
    }
  });

  // After a failed submit, clear each error as soon as the user fixes it.
  // New errors are only added on submit, so the layout never jumps under the
  // user's mouse or finger while they move between fields.
  function clearIfFixed(event) {
    const name = event.target.name;
    if (!submitted || !rules[name]) {
      return;
    }
    const errorEl = document.getElementById(name + "-error");
    if (errorEl && errorEl.textContent !== "" && rules[name]() === "") {
      setError(name, "");
    }
  }
  form.addEventListener("input", clearIfFixed);
  form.addEventListener("change", clearIfFixed);

  notes.addEventListener("input", updateCount);

  form.addEventListener("reset", function () {
    submitted = false;
    window.setTimeout(function () {
      Object.keys(rules).forEach(function (name) { setError(name, ""); });
      summary.hidden = true;
      updateContactName();
      updateCount();
    }, 0);
  });

  updateContactName();
  updateCount();
});
