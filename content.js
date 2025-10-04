function checkLinks() {
  const links = Array.from(document.querySelectorAll("a[href*='forms.office.com']"));
  if (links.length > 0) {
    const url = links[0].href;
    if (!window.__formsOpened) {
      window.__formsOpened = true;
      chrome.runtime.sendMessage({ url });
    }
  }
}

// Проверка сразу после загрузки
checkLinks();

// Наблюдатель за изменениями страницы
const observer = new MutationObserver(() => checkLinks());
observer.observe(document.body, { childList: true, subtree: true });
