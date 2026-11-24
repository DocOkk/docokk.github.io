/* Vcare Opticals - mobile menu toggle.
   Without JavaScript the menu stays open, so every link still works. */
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!header || !toggle || !nav) {
    return;
  }

  toggle.hidden = false;
  header.classList.add("menu-closed");

  toggle.addEventListener("click", function () {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.textContent = isOpen ? "Menu" : "Close";
    header.classList.toggle("menu-closed", isOpen);
  });

  // Close the menu with the Escape key and return focus to the button
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      toggle.click();
      toggle.focus();
    }
  });
});
