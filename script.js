const WEDDING_TARGET = new Date("2026-07-24T14:30:00+04:00").getTime();
const RSVP_WEBHOOK_URL = "/api/rsvp.php";

const body = document.body;
const intro = document.getElementById("intro");
const openButton = document.getElementById("openInvite");
let inviteWasOpened = false;

body.classList.remove("invite-opening", "invite-zoom", "invite-blackout", "invite-reveal", "invite-open");
body.classList.add("intro-active");

function openInvite() {
  if (inviteWasOpened) return;
  inviteWasOpened = true;
  body.classList.add("invite-opening");
  window.setTimeout(() => {
    body.classList.remove("intro-active");
    body.classList.add("invite-reveal", "invite-open");
    document.getElementById("top")?.scrollIntoView({ behavior: "auto" });
  }, 1600);
}

intro?.addEventListener("click", openInvite);
intro?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openInvite();
  }
});
openButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  openInvite();
});

function plural(value, forms) {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

function updateCountdown() {
  const now = Date.now();
  const diff = Math.max(0, WEDDING_TARGET - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  const values = { days, hours, minutes, seconds };
  const labels = {
    days: ["день", "дня", "дней"],
    hours: ["час", "часа", "часов"],
    minutes: ["минута", "минуты", "минут"],
    seconds: ["секунда", "секунды", "секунд"],
  };

  Object.entries(values).forEach(([unit, value]) => {
    const number = document.querySelector(`[data-unit="${unit}"]`);
    if (!number) return;
    number.textContent = String(value).padStart(unit === "days" ? 1 : 2, "0");
    number.nextElementSibling.textContent = plural(value, labels[unit]);
  });
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

const timeline = document.getElementById("timeline");
const heart = document.getElementById("rollingHeart");
const path = document.getElementById("heartPath");

function moveHeart() {
  if (!timeline || !heart || !path) return;

  const rect = timeline.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const progress = Math.min(1, Math.max(0, (viewport * 0.34 - rect.top) / (rect.height * 0.82)));
  const length = path.getTotalLength();
  const point = path.getPointAtLength(length * progress);
  const scaleX = rect.width / 360;
  const scaleY = rect.height / 760;

  heart.style.left = `${point.x * scaleX}px`;
  heart.style.top = `${point.y * scaleY}px`;
  heart.style.transform = `translate(-50%, -50%) rotate(${progress * 760}deg)`;
}

window.addEventListener("scroll", moveHeart, { passive: true });
window.addEventListener("resize", moveHeart);
moveHeart();

const form = document.getElementById("rsvpForm");
const note = document.getElementById("rsvpNote");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  const button = form.querySelector('button[type="submit"]');

  button.disabled = true;
  note.textContent = "Отправляем...";

  try {
    const response = await fetch(RSVP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      note.textContent = "Спасибо!";
      form.reset();
      return;
    }
  } catch {
    // Сетевая ошибка — покажем подсказку ниже.
  }

  note.textContent = "Не удалось отправить. Напишите нам вручную в разделе «Контакты».";
  button.disabled = false;
});
