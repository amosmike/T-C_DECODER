var LOADING_STEPS = [
  "Reading the fine print...",
  "Translating legalese...",
  "Identifying red flags...",
  "Calculating danger score...",
  "Almost there..."
];

var DANGER_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];
var DANGER_LABELS = ["All Clear", "Pretty Standard", "Worth Knowing", "Read Before Signing", "Danger Zone"];

function getDangerIndex(score) {
  if (score >= 100) return 4;
  return Math.floor(score / 20.1); 
}

function showView(name) {
  ["view-main", "view-settings", "view-loading", "view-result"].forEach(function(id) {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById("view-" + name).classList.remove("hidden");
}

function setStatus(id, msg, type) {
  var el = document.getElementById(id);
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrompt(text) {
  var lines = [
    "Analyze the provided Terms & Conditions text.",
    "CRITICAL: Output ONLY a single JSON object. Do not include markdown formatting, backticks, or any introductory text.",
    "",
    "--- SCORING SYSTEM (BASE 0, MAX 100) ---",
    "Identify these clauses and add to the score. Weight privacy/data abuse MUCH heavier than standard legal boilerplate:",
    "",
    "1. THE CREEP FACTOR (Severe Privacy/Data Risks - HIGH POINTS):",
    "   - Explicitly uses user content/data for Generative AI/ML training (+25)",
    "   - Uses user name/likeness/actions in paid advertising (+20)",
    "   - Collects Biometric data, health data, or cross-site tracking (+15)",
    "   - License to your content survives account deletion (+15)",
    "",
    "2. DECEPTIVE STRUCTURE (The 'Shadow Policy' - MEDIUM POINTS):",
    "   - Incorporates multiple external/linked policies (e.g., separate AI or Commercial terms) hiding the true scope of the agreement (+15)",
    "   - Right to change terms with continued use constituting consent (+10)",
    "",
    "3. LEGAL BOILERPLATE (Standard Corporate Defense - LOW POINTS):",
    "   - Mandatory Arbitration / Class Action Waiver (+5)",
    "   - Shortened legal claim window (e.g., 1 year) (+5)",
    "   - User Indemnification (user pays company legal fees) (+5)",
    "",
    "CALIBRATION: If a clause is clearly 'opt-in' only, do not add points. If it is 'opt-out', halve the points.",
    "",
    "Return this exact JSON structure:",
    "{",
    '  "dangerScore": <integer 0-100>,',
    '  "verdict": "<one honest punchy sentence based only on what the terms actually say>",',
    '  "summary": ["<plain English point>", "<plain English point>", up to 6 total],',
    '  "redFlags": ["<specific alarming clause>"]',
    "}",
    "",
    "Terms and Conditions to analyze:",
    text
  ];
  return lines.join("\n");
}

// Settings toggle
document.getElementById("toggle-settings").addEventListener("click", function() {
  var s = document.getElementById("view-settings");
  if (!s.classList.contains("hidden")) {
    showView("main");
    return;
  }
  chrome.storage.local.get("apiKey", function(data) {
    if (data.apiKey) document.getElementById("api-key-input").value = data.apiKey;
    showView("settings");
  });
});

document.getElementById("settings-back").addEventListener("click", function() {
  showView("main");
});

document.getElementById("settings-save").addEventListener("click", function() {
  var key = document.getElementById("api-key-input").value.trim();
  if (!key.startsWith("sk-ant-")) {
    setStatus("settings-status", "Key should start with sk-ant-", "err");
    return;
  }
  chrome.storage.local.set({ apiKey: key }, function() {
    setStatus("settings-status", "Saved!", "ok");
    setTimeout(function() { showView("main"); }, 800);
  });
});

// Extract from page
document.getElementById("btn-extract").addEventListener("click", function() {
  setStatus("main-status", "Extracting text from page...", "");
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: function() {
        var CHAR_LIMIT = 60000;

        function clean(raw) {
          return raw
            .replace(/\t/g, " ")
            .replace(/[^\S\n]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/^.{0,60}\n/gm, function(l) {
              return l.trim().split(" ").length <= 4 ? "" : l;
            })
            .trim();
        }

        ["nav","header","footer",'[class*="cookie"]','[class*="banner"]',
         '[class*="nav"]','[class*="header"]','[class*="footer"]','[role="navigation"]']
          .forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(el) { el.remove(); });
          });

        var selectors = [
          '[class*="terms"]','[class*="privacy"]','[class*="legal"]',
          '[class*="policy"]','[class*="agreement"]','[class*="tos"]',
          '[id*="terms"]','[id*="privacy"]','[id*="legal"]',
          '[id*="policy"]','[id*="agreement"]','article','main'
        ];

        for (var i = 0; i < selectors.length; i++) {
          var el = document.querySelector(selectors[i]);
          if (el) {
            var t = clean(el.innerText);
            if (t.length > 300) return t.slice(0, CHAR_LIMIT);
          }
        }
        return clean(document.body.innerText).slice(0, CHAR_LIMIT);
      }
    }, function(results) {
      if (chrome.runtime.lastError || !results || !results[0]) {
        setStatus("main-status", "Could not extract text from this page", "err");
        return;
      }
      var text = results[0].result;
      document.getElementById("tc-text").value = text;
      setStatus("main-status", "Grabbed " + text.length.toLocaleString() + " characters", "ok");
    });
  });
});

// Decode
document.getElementById("btn-decode").addEventListener("click", function() {
  var text = document.getElementById("tc-text").value.trim();
  if (!text) {
    setStatus("main-status", "Paste or grab some text first", "err");
    return;
  }

  chrome.storage.local.get("apiKey", function(data) {
    if (!data.apiKey) {
      setStatus("main-status", "Add your Anthropic API key in settings", "err");
      return;
    }

    showView("loading");
    var step = 0;
    document.getElementById("loading-step").textContent = LOADING_STEPS[0];
    var stepInterval = setInterval(function() {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      document.getElementById("loading-step").textContent = LOADING_STEPS[step];
    }, 1200);

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": data.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", 
        max_tokens: 1000,
        messages: [{ role: "user", content: buildPrompt(text) }]
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      clearInterval(stepInterval);
      if (data.error) throw new Error(data.error.message);

      var raw = "";
      if (data.content) {
        for (var i = 0; i < data.content.length; i++) {
          if (data.content[i].type === "text") { raw = data.content[i].text; break; }
        }
      }

      // THE FIX: Robust JSON Regex Extraction
      var match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in response");
      
      var parsed = JSON.parse(match[0]);
      renderResult(parsed);
    })
    .catch(function(err) {
      clearInterval(stepInterval);
      showView("main");
      setStatus("main-status", err.message || "Something went wrong", "err");
    });
  });
});

function renderResult(r) {
  var di = getDangerIndex(r.dangerScore);
  var color = DANGER_COLORS[di];
  var label = DANGER_LABELS[di];
  var circ = 2 * Math.PI * 26;
  var offset = circ - (r.dangerScore / 100) * circ;

  var summaryHTML = (r.summary || []).map(function(p) {
    return '<li class="summary-item">' + escapeHTML(p) + '</li>';
  }).join("");

  var flagsHTML = "";
  if (r.redFlags && r.redFlags.length > 0) {
    flagsHTML = '<ul class="flag-list">' + r.redFlags.map(function(f) {
      return '<li class="flag-item">' + escapeHTML(f) + '</li>';
    }).join("") + '</ul>';
  } else {
    flagsHTML = '<div class="no-flags">No major red flags detected</div>';
  }

  var flagCount = r.redFlags && r.redFlags.length ? " (" + r.redFlags.length + ")" : "";

  var html = [
    '<div class="score-row">',
      '<div class="score-circle">',
        '<svg width="70" height="70" style="filter:drop-shadow(0 0 8px ' + color + '55)">',
          '<circle cx="35" cy="35" r="26" fill="none" stroke="#1e1e2e" stroke-width="5"/>',
          '<circle cx="35" cy="35" r="26" fill="none" stroke="' + color + '" stroke-width="5"',
            'stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"',
            'stroke-linecap="round" transform="rotate(-90 35 35)"/>',
        '</svg>',
        '<span class="score-number" style="color:' + color + '">' + r.dangerScore + '</span>',
      '</div>',
      '<div>',
        '<div class="verdict">' + escapeHTML(r.verdict) + '</div>',
        '<span class="danger-badge" style="color:' + color + ';border:1px solid ' + color + '44;background:' + color + '11">' + label + '</span>',
      '</div>',
    '</div>',
    '<div class="section-title blue">What you\'re agreeing to</div>',
    '<ul class="summary-list">' + summaryHTML + '</ul>',
    '<div class="section-title red">Red Flags' + flagCount + '</div>',
    flagsHTML,
    '<div class="btn-row" style="margin-top:8px;">',
      '<button class="btn btn-back" id="btn-back-result">← Decode Another</button>',
    '</div>'
  ].join("");

  var el = document.getElementById("view-result");
  el.innerHTML = html;
  showView("result");

  document.getElementById("btn-back-result").addEventListener("click", function() {
    document.getElementById("tc-text").value = "";
    setStatus("main-status", "", "");
    showView("main");
  });
}