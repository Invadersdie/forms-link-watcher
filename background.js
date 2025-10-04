chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.url) {
    chrome.tabs.create({ url: message.url });
  }
});
