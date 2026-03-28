function cleanText(raw) {
  return raw
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^.{0,60}\n/gm, function(l) { return l.trim().split(' ').length <= 4 ? '' : l; })
    .replace(/(cookie|accept all|reject all|privacy settings).{0,80}\n/gi, '')
    .trim();
}

function extractTCText() {
  var CHAR_LIMIT = 60000;

  var noiseSelectors = ['nav', 'header', 'footer',
    '[class*="cookie"]', '[class*="banner"]', '[class*="nav"]',
    '[class*="header"]', '[class*="footer"]', '[role="navigation"]'];
  noiseSelectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(function(el) { el.remove(); });
  });

  var selectors = [
    '[class*="terms"]', '[class*="privacy"]', '[class*="legal"]',
    '[class*="policy"]', '[class*="agreement"]', '[class*="tos"]',
    '[id*="terms"]', '[id*="privacy"]', '[id*="legal"]',
    '[id*="policy"]', '[id*="agreement"]', 'article', 'main'
  ];

  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) {
      var text = cleanText(el.innerText);
      if (text.length > 300) return text.slice(0, CHAR_LIMIT);
    }
  }

  return cleanText(document.body.innerText).slice(0, CHAR_LIMIT);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extractText") {
    sendResponse({ text: extractTCText() });
  }
});
